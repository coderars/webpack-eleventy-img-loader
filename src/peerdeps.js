const LoaderError = require('./error');

/** @typedef {import("@11ty/eleventy-img")} EleventyImg */
/** @typedef {import("@11ty/eleventy-cache-assets")} EleventyCacheAssets */

/**
 * @typedef {Object} PeerDeps
 * @property {EleventyImg} eleventyImg eleventy-img
 * @property {EleventyCacheAssets} eleventyCache eleventy-cache-assets
 */

/**
 * Try to get the requested package
 */
function getPeerDependency(pkg) {
  if (typeof pkg === 'string') {
    try {
      return require(pkg);
    } catch (err) {
      throw new LoaderError(`Unable to resolve "${pkg}". Please install it or configure manually (see options).`, err).setFatal();
    }    
  }

  // probably an already loaded package
  return pkg;
}

/** @type {Promise<PeerDeps>} */
let DEPS_PROMISE_SINGLETON;

/**
 * Get peer dependencies as a singleton Promise
 * 
 * @param {Object} options - Loader options
 * @returns {Promise<PeerDeps>}
 */
module.exports = (options) => {
  return DEPS_PROMISE_SINGLETON ?? (
    DEPS_PROMISE_SINGLETON = new Promise((resolve, reject) => {
      try {
        const /** @type {EleventyImg} */ eleventyImg = getPeerDependency(options.eleventyImage);
        const /** @type {EleventyCacheAssets} */ eleventyCache = getPeerDependency(options.eleventyCache);

        if (options.concurrency) {
          // https://www.11ty.dev/docs/plugins/image/#change-global-plugin-concurrency
          // idea?: Math.max(1, os.cpus().length - 1)
          eleventyImg.concurrency = options.concurrency;
        }

        if (options.fetchConcurrency) {
          // https://www.11ty.dev/docs/plugins/cache/#change-global-plugin-concurrency
          eleventyCache.concurrency = options.fetchConcurrency;
        }

        resolve({ eleventyImg, eleventyCache });

      } catch (err) {
        reject(err);
      }
    })
  );
};
