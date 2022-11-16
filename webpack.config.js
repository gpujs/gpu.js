const path = require('path');

const web = {
  target: 'web',
  mode: 'development',
  devtool: 'source-map',
  resolve: {
    fallback: {
      path: false,
      fs: false,
    }
  },
  output: {
    filename: 'gpu-browser.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'window',
  },
};



module.exports = [web];
