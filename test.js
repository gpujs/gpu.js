const gpu = new GPU();
const createTexture = gpu
  .createKernel(function() {
    return 200;
  })
  .setOutput([512])
  .setOutputToTexture(true);
const texture = createTexture();
console.log(texture);
const useTexture = gpu
  .createKernel(
    function() {
      return this.constants.texture[this.thread.x];
    },
    {
      constants: { texture }
    }
  )
  .setOutput([512]);
const proof = useTexture();
console.log(proof);
