// The whole pipeline, in the order gulp ran it. beautify comes after build on
// purpose: the bundle is produced from the sources as committed, and any
// reformatting lands in the next build.
const { build } = require('./build');
const { beautify } = require('./beautify');
const { minify } = require('./minify');
const { buildTests } = require('./build-tests');

async function make() {
  console.log('build');
  await build();
  console.log('beautify');
  beautify();
  console.log('minify');
  await minify();
  console.log('build-tests');
  buildTests();
}

make().catch(error => {
  console.error(error);
  process.exit(1);
});
