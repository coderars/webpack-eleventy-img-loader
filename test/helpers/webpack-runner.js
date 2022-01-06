const path = require("path");
const webpack = require('webpack');
const { createFsFromVolume, Volume } = require("memfs");

const TEST_ROOT = path.resolve(__dirname, '..');
const PKG_ROOT = path.resolve(TEST_ROOT, '..');

module.exports = (testResource, loaderOptions = {}) => {
  const compiler = webpack({
    context: TEST_ROOT,
    entry: testResource,
    output: {
      path: '/', // write output files to the root of memFs!
      publicPath: '/',
      assetModuleFilename: '[name][ext]',
    },
    mode: 'none',
    module: {
      rules: [
        {
          test: /\.(jpe?g|png|webp|avif|tiff|fetch|rimg)$/i,
          // always emit file (no data URIs, we have assertions fot the emitted files!)
          // do not use type: 'asset' for the tests!
          type: 'asset/resource',
          use: [
            {
              loader: require.resolve(path.resolve(PKG_ROOT, 'src', 'loader.js')),
              options: loaderOptions
            }
          ]
        },
      ]
    }
  });

  // https://webpack.js.org/api/node/#custom-file-systems
  // https://www.npmjs.com/package/memfs
  const memFs = createFsFromVolume(new Volume());

  compiler.outputFileSystem = memFs;

  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (!error && stats.compilation.errors.length) {
        reject(stats.compilation.errors[0]);
        return;
      } else if (error) {
        reject(error);
        return;
      }
      
      resolve({
        assets: stats.compilation.assets,
        memFs
      });
    });
  });
};