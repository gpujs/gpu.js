const gpu = new GPU();
const createTexture = gpu
  .createKernel(function() {
    return 255;
  })
  .setOutput([512])
  .setOutputToTexture(true);
const texture = createTexture();
console.log(texture);
const useTexture = gpu
  .createKernel(
    function() {
      return constants.texture[this.thread.x];
    },
    {
      constants: { texture }
    }
  )
  .setOutput([512]);
const proof = useTexture();
console.log(proof);
