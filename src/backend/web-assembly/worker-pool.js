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
 *
 * Pipeline entries ('pipelineSetup'/'pipelineRun') execute a WHOLE fused
 * plan per task: every step module is instantiated over the plan's shared
 * memory once at setup, then one run message walks all steps with an
 * Atomics barrier between them — a generation counter in the shared memory,
 * so step boundaries cost no postMessage round trip. Waits are sliced to
 * 100ms so a barrier that can never fill (a peer died) is escapable: the
 * main thread sets the abort word and notifies the generation word, and
 * every check of either releases the worker to ack and go idle.
 */
const WORKER_SOURCE = `
var entries = {};
var pipelines = {};
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
  } else if (message.type === 'pipelineSetup') {
    var instances = [];
    for (var i = 0; i < message.modules.length; i++) {
      var imports = { env: { memory: message.memory } };
      var math = message.moduleMathImports[i];
      for (var j = 0; j < math.length; j++) {
        imports.env['math_' + math[j]] = Math[math[j]];
      }
      instances.push(new WebAssembly.Instance(message.modules[i], imports));
    }
    var steps = [];
    for (var i = 0; i < message.steps.length; i++) {
      var exported = instances[message.steps[i].module].exports;
      steps.push({
        run: exported.run,
        runSimd: exported.run_simd || null,
        sizeX: message.steps[i].sizeX
      });
    }
    pipelines[message.id] = {
      steps: steps,
      i32: new Int32Array(message.memory.buffer),
      countIndex: message.countIndex,
      genIndex: message.genIndex,
      abortIndex: message.abortIndex
    };
    post({ type: 'ready', id: message.id });
  } else if (message.type === 'release') {
    delete entries[message.id];
    delete pipelines[message.id];
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
  } else if (message.type === 'pipelineRun') {
    var pipeline = pipelines[message.id];
    var i32 = pipeline.i32;
    var gen = message.baseGen;
    var aborted = false;
    for (var s = 0; s < pipeline.steps.length && !aborted; s++) {
      if (Atomics.load(i32, pipeline.abortIndex)) {
        aborted = true;
        break;
      }
      var step = pipeline.steps[s];
      var start = message.ranges[s * 2];
      var end = message.ranges[s * 2 + 1];
      var seed = message.seeds[s];
      if (end > start) {
        if (step.runSimd && (step.sizeX & 3) === 0 && (start & 3) === 0) {
          var quadEnd = end - ((end - start) & 3);
          if (quadEnd > start) step.runSimd(start, quadEnd, seed);
          if (quadEnd < end) step.run(quadEnd, end, seed);
        } else {
          step.run(start, end, seed);
        }
      }
      gen++;
      if (Atomics.add(i32, pipeline.countIndex, 1) + 1 === message.workerCount) {
        Atomics.store(i32, pipeline.countIndex, 0);
        Atomics.store(i32, pipeline.genIndex, gen);
        Atomics.notify(i32, pipeline.genIndex);
      } else {
        for (;;) {
          if (Atomics.load(i32, pipeline.genIndex) >= gen) break;
          if (Atomics.load(i32, pipeline.abortIndex)) {
            aborted = true;
            break;
          }
          Atomics.wait(i32, pipeline.genIndex, gen - 1, 100);
        }
      }
    }
    post({ type: 'done', taskId: message.taskId, aborted: aborted });
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
    // the thread, and a message posted to a corpse never answers. The handle
    // is terminated explicitly -- an uncaught exception does NOT kill a
    // browser worker, so without this a "dead" worker would live on as a
    // zombie thread pinning every wasm memory it ever instantiated
    worker.die = error => {
      if (worker.dead) return;
      worker.dead = true;
      worker.fail(error);
      if (worker.handle && typeof worker.handle.terminate === 'function') {
        try {
          worker.handle.terminate();
        } catch (e) {}
      }
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
   * entry share the in-flight ready wait rather than re-sending the module.
   * Kernel entries and pipeline entries share this bookkeeping (a pool is
   * owned by exactly one kernel or one pipeline executor, and pipeline ids
   * are string-prefixed, so the id spaces cannot collide); only the setup
   * message shape differs.
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
      worker.handle.postMessage(entry.pipeline ? {
        type: 'pipelineSetup',
        id: entry.id,
        memory: entry.memory,
        modules: entry.modules,
        moduleMathImports: entry.moduleMathImports,
        steps: entry.steps,
        countIndex: entry.countIndex,
        genIndex: entry.genIndex,
        abortIndex: entry.abortIndex,
      } : {
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

  /**
   * One task per worker for a WHOLE fused plan: the barrier between steps
   * lives in the entry's shared memory, so this is the only postMessage
   * round trip a pipeline call makes. Every worker in [0, workerCount) must
   * receive its task — the barrier fills only at workerCount arrivals — and
   * a worker that dies rejects its task through the pool's usual machinery,
   * which is the caller's signal to set the entry's abort word.
   * @param {Object} entry pipeline entry: {id, pipeline, memory, modules,
   * moduleMathImports, steps, countIndex, genIndex, abortIndex, workerCount,
   * workerRanges}
   * @param {Object} run per-call inputs: {baseGen, seeds}
   * @returns {Promise<void>} resolves when every worker has acked its walk
   * of the plan
   */
  dispatchPipeline(entry, run) {
    if (this.destroyed) return Promise.reject(new Error('WebAssembly worker pool has been destroyed'));
    this.dispatchCount++;
    this.lastDispatch = {
      workerCount: entry.workerCount,
      ranges: entry.workerRanges.map(ranges => ranges.slice()),
    };
    const runs = [];
    for (let index = 0; index < entry.workerCount; index++) {
      const worker = this._worker(index);
      runs.push(this._ensureSetup(worker, entry).then(() => new Promise((resolve, reject) => {
        if (worker.dead) {
          reject(new Error('WebAssembly worker died before the task could run'));
          return;
        }
        const taskId = ++this._taskId;
        worker.state.pending.set(taskId, { resolve, reject });
        this._updateRef(worker);
        worker.handle.postMessage({
          type: 'pipelineRun',
          id: entry.id,
          taskId,
          ranges: entry.workerRanges[index],
          seeds: run.seeds,
          baseGen: run.baseGen,
          workerCount: entry.workerCount,
        });
      })));
    }
    return Promise.all(runs).then(() => undefined);
  }

  /**
   * Drops an entry's instantiation from every live worker: the worker-side
   * instances are what keep an evicted entry's shared memory alive (#870).
   * The caller guarantees no task for this entry is still in flight.
   */
  release(entryId) {
    if (this.destroyed) return;
    for (const worker of this.workers) {
      if (worker.dead) continue;
      worker.state.setup.delete(entryId);
      const wait = worker.state.settingUp.get(entryId);
      if (wait) {
        // the caller's no-in-flight guarantee makes this unreachable, but a
        // silently deleted wait would hang its dispatch forever; reject loud
        worker.state.settingUp.delete(entryId);
        wait.reject(new Error('WebAssembly kernel entry released during setup'));
        this._updateRef(worker);
      }
      worker.handle.postMessage({ type: 'release', id: entryId });
    }
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