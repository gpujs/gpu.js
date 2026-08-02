// `os` resolves to the empty module in the browser bundles (aliased like
// `gl`), so its shape is probed before use rather than assumed
let os = null;
try {
  os = require('os');
} catch (e) {}

// Node has no global Worker; browsers with workers always do. Decided once —
// the two paths differ only in construction and event wiring, the protocol
// is identical
const IS_BROWSER_WORKER = typeof Worker === 'function';

function defaultConcurrency() {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  if (os && typeof os.cpus === 'function') {
    const count = os.cpus().length;
    if (count) return count;
  }
  return 4;
}

/**
 * The worker body. A template string with NO closure captures: it must
 * survive being evaluated from a blob URL (browser) or `eval: true` (Node),
 * where nothing from this module's scope exists. Everything a task needs
 * arrives by message: the compiled WebAssembly.Module and the shared
 * WebAssembly.Memory structured-clone once per (worker, entry), then
 * {start, end, seed} per task — results are written straight into the
 * shared memory, so acks carry no data.
 *
 * The run dispatch mirrors the kernel's sync path: quads must not cross an
 * x-row, so run_simd is used only when the row width is a multiple of 4 (a
 * 4-aligned range start then lands every quad inside one row); other shapes
 * take the scalar export, which is bit-identical by the SIMD contract.
 */
const WORKER_SOURCE = `
var entries = {};
function handleMessage(message, post) {
  if (message.type === 'setup') {
    var imports = { env: { memory: message.memory } };
    for (var i = 0; i < message.mathImports.length; i++) {
      imports.env['math_' + message.mathImports[i]] = Math[message.mathImports[i]];
    }
    var instance = new WebAssembly.Instance(message.module, imports);
    entries[message.id] = {
      run: instance.exports.run,
      runSimd: instance.exports.run_simd || null,
      sizeX: message.sizeX
    };
    post({ type: 'ready', id: message.id });
  } else if (message.type === 'run') {
    var entry = entries[message.id];
    var start = message.start;
    var end = message.end;
    var seed = message.seed;
    if (entry.runSimd && (entry.sizeX & 3) === 0 && (start & 3) === 0) {
      var quadEnd = end - ((end - start) & 3);
      if (quadEnd > start) entry.runSimd(start, quadEnd, seed);
      if (quadEnd < end) entry.run(quadEnd, end, seed);
    } else {
      entry.run(start, end, seed);
    }
    post({ type: 'done', taskId: message.taskId });
  }
}
if (typeof self !== 'undefined' && typeof postMessage === 'function') {
  self.onmessage = function(event) {
    handleMessage(event.data, function(message) { postMessage(message); });
  };
} else {
  var parentPort = require('worker_threads').parentPort;
  parentPort.on('message', function(message) {
    handleMessage(message, function(reply) { parentPort.postMessage(reply); });
  });
}
`;

/**
 * @desc Lazy worker pool for the threaded run path. Workers spawn on first
 * use and only as many as a dispatch actually assigns; each holds
 * instantiations keyed by entry id (one per kernel size signature) over the
 * entry's shared memory, so a module and memory cross the postMessage
 * boundary exactly once per worker.
 *
 * The main thread never blocks: dispatch returns a Promise resolved by the
 * workers' completion acks — no Atomics.wait anywhere.
 *
 * Lifecycle rules the runtime review demanded:
 * - A worker that dies (wasm trap, OOM, eviction) rejects its in-flight
 *   tasks AND is retired from the pool; the next dispatch that needs its
 *   slot spawns a replacement with fresh setup state. A dead worker can
 *   never be handed a task — that message would vanish and the task's
 *   Promise would hang forever.
 * - Node workers are unref'd while idle and ref'd only while tasks are in
 *   flight, so a script that runs a threaded kernel and ends actually
 *   exits — without letting a fully-unref'd pool drop the process mid
 *   dispatch.
 */
class WebAssemblyWorkerPool {
  constructor(size) {
    this.size = size || defaultConcurrency();
    this.workers = [];
    this.destroyed = false;
    // instrumentation the thread tests assert on: how a dispatch was split
    // and how many dispatches this pool has served
    this.dispatchCount = 0;
    this.lastDispatch = null;
    this._taskId = 0;
  }

  get liveWorkerCount() {
    let count = 0;
    for (const worker of this.workers) {
      if (!worker.dead) count++;
    }
    return count;
  }

  _spawn() {
    const worker = {
      handle: null,
      dead: false,
      state: {
        setup: new Set(),
        settingUp: new Map(),
        pending: new Map(),
      },
      fail: null,
      die: null,
    };
    const state = worker.state;
    worker.fail = error => {
      for (const wait of state.settingUp.values()) wait.reject(error);
      state.settingUp.clear();
      for (const task of state.pending.values()) {
        task.reject(error);
      }
      state.pending.clear();
    };
    // death retires the worker: its instantiations and setup cache died with
    // the thread, and a message posted to a corpse never answers
    worker.die = error => {
      if (worker.dead) return;
      worker.dead = true;
      worker.fail(error);
    };
    const onMessage = message => {
      if (message.type === 'ready') {
        const wait = state.settingUp.get(message.id);
        if (wait) {
          state.settingUp.delete(message.id);
          state.setup.add(message.id);
          this._updateRef(worker);
          wait.resolve();
        }
      } else if (message.type === 'done') {
        const task = state.pending.get(message.taskId);
        if (task) {
          state.pending.delete(message.taskId);
          this._updateRef(worker);
          task.resolve();
        }
      }
    };
    let handle;
    if (IS_BROWSER_WORKER) {
      // revoked immediately: the worker holds its own reference once created
      const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      handle = new Worker(url);
      URL.revokeObjectURL(url);
      handle.onmessage = event => onMessage(event.data);
      handle.onerror = event => worker.die(new Error(event.message || 'WebAssembly worker error'));
    } else {
      const { Worker: NodeWorker } = require('worker_threads');
      handle = new NodeWorker(WORKER_SOURCE, { eval: true });
      handle.on('message', onMessage);
      handle.on('error', error => worker.die(error));
      handle.on('exit', code => {
        worker.die(new Error(`WebAssembly worker exited with code ${ code }`));
      });
      // idle by default; _taskStarted refs while work is in flight
      handle.unref();
    }
    worker.handle = handle;
    return worker;
  }

  _worker(index) {
    while (this.workers.length <= index) {
      this.workers.push(this._spawn());
    }
    if (this.workers[index].dead) {
      this.workers[index] = this._spawn();
    }
    return this.workers[index];
  }

  /**
   * Event-loop handle accounting, per worker: ref'd while it has a setup OR
   * a task in flight, unref'd when idle. The setup window matters -- a
   * pending Promise does not hold Node's event loop, so a pool unref'd
   * during module setup lets the process exit silently mid-dispatch.
   * Browser workers have no ref/unref and need none.
   */
  _updateRef(worker) {
    if (worker.dead || !worker.handle || typeof worker.handle.ref !== 'function') return;
    if (worker.state.settingUp.size + worker.state.pending.size > 0) {
      worker.handle.ref();
    } else {
      worker.handle.unref();
    }
  }

  /**
   * One setup message per (worker, entry) — concurrent tasks for the same
   * entry share the in-flight ready wait rather than re-sending the module
   */
  _ensureSetup(worker, entry) {
    if (worker.state.setup.has(entry.id)) return Promise.resolve();
    let wait = worker.state.settingUp.get(entry.id);
    if (!wait) {
      wait = {};
      wait.promise = new Promise((resolve, reject) => {
        wait.resolve = resolve;
        wait.reject = reject;
      });
      worker.state.settingUp.set(entry.id, wait);
      this._updateRef(worker);
      worker.handle.postMessage({
        type: 'setup',
        id: entry.id,
        module: entry.module,
        memory: entry.memory,
        mathImports: entry.mathImports,
        sizeX: entry.sizeX,
      });
    }
    return wait.promise;
  }

  /**
   * @param {Object} entry kernel module entry: {id, module, memory, mathImports, sizeX}
   * @param {Array} tasks contiguous {start, end, seed} ranges, one per worker
   * @returns {Promise<void>} resolves when every range has been computed into
   * the entry's shared memory
   */
  dispatch(entry, tasks) {
    if (this.destroyed) return Promise.reject(new Error('WebAssembly worker pool has been destroyed'));
    this.dispatchCount++;
    this.lastDispatch = {
      workerCount: tasks.length,
      ranges: tasks.map(task => [task.start, task.end]),
    };
    const runs = tasks.map((task, index) => {
      const worker = this._worker(index);
      return this._ensureSetup(worker, entry).then(() => new Promise((resolve, reject) => {
        if (worker.dead) {
          reject(new Error('WebAssembly worker died before the task could run'));
          return;
        }
        const taskId = ++this._taskId;
        worker.state.pending.set(taskId, { resolve, reject });
        this._updateRef(worker);
        worker.handle.postMessage({
          type: 'run',
          id: entry.id,
          taskId,
          start: task.start,
          end: task.end,
          seed: task.seed,
        });
      }));
    });
    return Promise.all(runs).then(() => undefined);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const error = new Error('WebAssembly worker pool has been destroyed');
    for (const worker of this.workers) {
      worker.dead = true;
      worker.fail(error);
      worker.handle.terminate();
    }
    this.workers = [];
  }
}

module.exports = {
  WebAssemblyWorkerPool
};