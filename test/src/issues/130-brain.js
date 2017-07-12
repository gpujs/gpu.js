QUnit.test( "Issue #130 - brain.js ", function() {
    const gpu = new GPU({mode: 'gpu'});
    const learningRate = 0.3;
    const momentum = 0.1;
    let sizes = [2, 3, 1];
    let biases = []; // weights for bias nodes
    let weights = [];
    let outputs = [];     
    let forwardPropagate = [];
    let backwardPropagate = [];
    let changesPropagate = [];
    let weightsPropagate = [];
    let biasesPropagate = [];
    let weightsToFloat = [];
    let deltas = [];
    let changes = []; // for momentum
    let errors = [];
    let outputLayer = sizes.length - 1;
    let keepNetworkIntact = false;
    let data = [{input: [0, 0], output: [0]},
                {input: [0, 1], output: [1]},
                {input: [1, 0], output: [1]},
                {input: [1, 1], output: [0]}];
    
    for (let layer = 0; layer <= outputLayer; layer++) {
      let size = sizes[layer];
      deltas[layer] = zeros(size);
      errors[layer] = zeros(size);
      if (!keepNetworkIntact) {
        outputs[layer] = zeros(size);
      }

      if (layer > 0) {
        biases[layer] = randos(size);
        if (!keepNetworkIntact) {
          weights[layer] = new Array(size);
        }
        changes[layer] = new Array(size);

        for (let node = 0; node < size; node++) {
          let prevSize = sizes[layer - 1];
          if (!keepNetworkIntact) {
            weights[layer][node] = randos(prevSize);
          }
          changes[layer][node] = zeros(prevSize);
        }
      }
    }

    function buildRunInput() {
        function weightedSum(weights, biases, x, inputs) {
            var sum = biases[x];
            for (var k = 0; k < size; k++) {
                sum += weights[x][k] * inputs[k];
            }
            return 1 / (1 + Math.exp(-sum));
        }

        for (var layer = 1; layer <= outputLayer; layer++) {
            const kernel = gpu.createKernelMap([weightedSum],
                function (weights, biases, inputs) {
                    return weightedSum(weights, biases, this.thread.x, inputs);
                }, {
                    constants: {
                        size: sizes[layer - 1]
                    }
                }).setDimensions([sizes[layer]]);
            forwardPropagate[layer] = kernel;
        }

    }

    function runInput(input) {
        let output;
        outputs[0] = input;
        for (var layer = 1; layer <= outputLayer; layer++) {
            outputs[layer] = forwardPropagate[layer](
                weights[layer], biases[layer], input
            ).result;
            output = input = outputs[layer];
        }
    }

    buildRunInput();
    let input = data[0].input;
    runInput(input);

    function buildCalculateDeltas(gpu){

        function calcError(outputs, target) {
            return target[this.thread.x] - outputs[this.thread.x];
        }

        function calcDeltas(error, output) {
            return error * output * (1 - output);
        }

        function calcErrorOutput(nextWeights, nextDeltas){
            var error = 0;
            for(var k = 0; k < size; k++){
                error += nextDeltas[k] * nextWeights[k][this.thread.x];
            }
            return error;
        }

        for(var layer = outputLayer; layer >= 0; layer--){
            if(layer == outputLayer){
                const kernel = gpu.createKernelMap({
                    error: calcError,
                    deltas: calcDeltas
                }, function(outputs, target){
                var output = outputs[this.thread.x];
                    return calcDeltas(calcError(outputs, target), output);
                }).setDimensions([weights[layer].length]);
                
                backwardPropagate[layer] = kernel;

            }else{
                const kernel = gpu.createKernelMap({
                    error: calcErrorOutput,
                    deltas: calcDeltas
                }, function(nextWeights, outputs, nextDeltas){
                var output = outputs[this.thread.x];
                    return calcDeltas(calcErrorOutput(nextWeights, nextDeltas), output);
                }, {
                constants: {
                    size: deltas[layer + 1].length
                }
                }).setDimensions([sizes[layer]]);
                
                backwardPropagate[layer] = kernel;
            }
        }
    }

    buildCalculateDeltas(gpu);

    function calculateDeltas(target){
        for (var layer = outputLayer; layer >= 0; layer--) {
            let output;
            if(layer == outputLayer){
                output = backwardPropagate[layer](
                outputs[layer],
                target);
            } else {
                output = backwardPropagate[layer](
                weights[layer + 1],
                outputs[layer],
                deltas[layer + 1]);
            }

            deltas[layer] = output.result;
            errors[layer] = output.error.toArray ? output.error.toArray(gpu) : output.error;
        }
    }

    calculateDeltas(data[0].output);

    function buildGetChanges(){
        for (let layer = 1; layer <= outputLayer; layer++) {
        const kernel = gpu.createKernelMap(
            function(previousOutputs, deltas, changes, learningRate, momentum){
            
            var change = 0;
            change = (learningRate * deltas[this.thread.y] * previousOutputs[this.thread.x])
                    + (momentum * changes[this.thread.y][this.thread.x]);
            return change;
            
            }).setDimensions([sizes[layer-1], sizes[layer]]);

         changesPropagate[layer] = kernel;
        }    
  }
  
    function getChanges(learningRate){
        for (let layer = 1; layer <= outputLayer; layer++) {
            let output = changesPropagate[layer](
                outputs[layer - 1],
                deltas[layer],
                changes[layer],
                learningRate,
                momentum
            );
            
            changes[layer] = output;
        }
    }

    buildGetChanges();
    getChanges(learningRate);


    function buildChangeWeights(){
        function addR(c, w, x, y) {
           return c[y][x] + w[y][x];
        }
        
        for (let layer = 1; layer <= outputLayer; layer++) {
            const kernel = gpu.createKernelMap([addR], function(changes, weights){
                return addR(changes, weights, this.thread.x, this.thread.y);        
            }).setDimensions([sizes[layer-1], sizes[layer]]);
            
            weightsPropagate[layer] = kernel;
            
        }    
    }

    function changeWeights(){
        for (let layer = 1; layer <= outputLayer; layer++) {
            let output = weightsPropagate[layer](
                changes[layer],
                weights[layer]
            );

            weights[layer] = output.result;
        }  
    }

    buildChangeWeights();

    changeWeights();

    console.log(weights[1][0]);

    for (let i = 1; i <= weights.length; i++) {
        for (let j = 0; j < weights[i].length; j++) {
            for (let k = 0; k < weights[i][j].length; k++) {
                QUnit.assert.equal((weights[i][j][k] < 10) && (weights[i][j][k] > -10), true);
            }
        }
    }


});

function randos(size){
  let array = new Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = randomWeight();
  }
  return array;
}

function zeros(size){
  let array = new Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = 0;
  }
  return array;
}

function randomWeight(){
    return Math.random() * 0.4 - 0.2;
}