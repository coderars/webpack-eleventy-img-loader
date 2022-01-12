// https://webpack.js.org/contribute/writing-a-loader
// https://webpack.js.org/api/loaders/
const schema = require("./schema.json");
const path = require("path");
const { createHash } = require("crypto");
const assert = require('assert');
const FileInfo = require("./fileinfo");
const LoaderError = require('./error');
const peerDependencies = require('./peerdeps');

const LOADERNAME = 'WebpackEleventyImgLoader';
const LOADER_TIME_INIT = new Date();

// shorthand helpers
const { isPlainObject, isStringNE } = require('./helpers');

// shared variables
let debugIsEmpty = true;

/** @typedef {import("webpack").LoaderContext<LoaderOptions>} LoaderContext */

/**
 * @typedef {Object} ImageData
 * @property {String} format Final format of the image
 * @property {number} width Image width
 * @property {number} height Image height
 * @property {String} url Image url
 * @property {String} sourceType Image mimetype
 * @property {Buffer} buffer The buffer holding the image
 */

class LoaderWorker {
  constructor (context, content, userOptions = {}) {
    /** @type {LoaderContext} */
    this.context = context;

    /** @type {Buffer} */
    this.content = content;

    this.options = {
      eleventyImage: '@11ty/eleventy-img',
      eleventyCache: '@11ty/eleventy-cache-assets',
      rename: '[oldname]',
      concurrency: null,
      fetchConcurrency: null,
      fetchFileExt: 'fetch',
      cacheDownloads: false,
      cacheResults: false,
      cacheDir: null,
      cacheDuration: null,
      beforeFetch: null,
      debug: false,
      ...userOptions
    };

    this.fileInfo = new FileInfo(context.resource, content, this.options);
    this.timeStart = new Date();
  }

  /**
   * Downloads an image and writes it into disk cache (if option enabled).
   * Implements "options.beforeFetch" to allow customizing fetch parameters.
   * 
   * @param {String} imageUrl - The url of the remote image
   * @returns {Promise<Buffer>}
   */
  async downloadImage(imageUrl) {
    let customOptions;

    if (typeof this.options.beforeFetch === 'function') {
      const result = await this.options.beforeFetch(imageUrl, this.fileInfo.resource);

      const makeError = (msg) => new LoaderError(`Result of "options.beforeFetch" ${msg}`).setFatal();

      if (result instanceof URL) {
        imageUrl = result.href;

      } else if (isStringNE(result)) {
        imageUrl = result;
        
      } else if (isPlainObject(result)) {
        const { fetchUrl, fetchOptions } = result;

        imageUrl = (fetchUrl instanceof URL) ? fetchUrl.href : fetchUrl;

        assert(isStringNE(imageUrl), makeError('has no or invalid value for key "fetchUrl".'));
        assert(isPlainObject(fetchOptions), makeError('has no or invalid value for key "fetchOptions".'));

        // add fetchOptions only if we have at least one option set
        // https://www.npmjs.com/package/node-fetch#options
        if (Object.keys(fetchOptions).length) {
          customOptions = { fetchOptions };
        }

      } else {
        assert.fail(makeError(`must be a non-empty instance of <String>|<URL>|<Object>. Got "${typeof result}".`));
      }
    }

    this.debug('download', {
      fetchFile: this.fileInfo.resource,
      fetchUrl: imageUrl,
      ...customOptions
    });

    // Download image using @11ty/eleventy-cache-assets
    // Store the image in cache (or read from) if option is enabled
    // (https://www.11ty.dev/docs/plugins/cache)
    return this.eleventyCache(imageUrl, {
      directory: this.options.cacheDir,
      duration: this.options.cacheDuration,
      dryRun: this.options.cacheDownloads ? false : true,
      type: "buffer",
      ...customOptions
    });
  }

  /**
   * Init cache system if enabled.
   * Failsafe (exceptions are gracefully converted to warnings, cache disregarded)
   * 
   * @param {Buffer} inputBuffer - The buffer holding the source image.
   */
  async initCache(inputBuffer) {
    let result = {
      imageDataFound: null,
      save: (imageData) => false,
      debugInfo: ''
    };

    if (this.options.cacheResults) {
      try {
        const cacheId = createHash('md4')
          .update(this.context.resource)
          // .update(String(Buffer.byteLength(buffer))) // instead content hash (faster)
          .update(inputBuffer)
          .digest('hex');

        const { AssetCache } = this.eleventyCache;

        // https://www.11ty.dev/docs/plugins/cache/#manually-store-your-own-data-in-the-cache
        const cache = new AssetCache(cacheId, this.options.cacheDir);

        if (cache.isCacheValid(this.options.cacheDuration)) {
          result.imageDataFound = await cache.getCachedValue();
          // we need to convert the buffer string from json back to a real buffer
          result.imageDataFound.buffer = Buffer.from(result.imageDataFound.buffer);
          result.debugInfo = 'from cache';
        }

        result.save = (imageData) => {
          try {
            cache.save(imageData, 'json');
            result.debugInfo = 'saved to cache';

          } catch (err) {
            this.context.emitWarning(
              new LoaderError('Cannot save image data to cache.', err)
            );
          }
        };

      } catch (err) {
        // Falling gracefully with adding a warning to Webpack's log system.
        this.context.emitWarning(
          new LoaderError('Cannot read cache (initialization failure)', err)
        );
      }
    }

    return result;
  }

  /**
   * Process (optimize/convert) the input image buffer.
   * Uses @11ty/eleventy-img (based on Sharp)
   * https://www.11ty.dev/docs/plugins/image/
   * 
   * @param {Buffer} buffer - The image buffer to process
   * @returns {Promise<ImageData>} ImageData object
   */
  async processImageBuffer(buffer) {
    let stats = await this.eleventyImg(buffer, {
      dryRun: true, // important!!: do not write any output to disk, we need only the result buffer from stats!
      urlPath: '', // has no effect in our case
      outputDir: '', // has no effect in our case
      widths: [this.fileInfo.toWidth ?? null],
      formats: [this.fileInfo.toFormat ?? null],
      sharpPngOptions: {
        palette: true,
        compressionLevel: 9 //def:6
      }
    });

    let resultFormat = Object.keys(stats)[0];
    let resultImageData = stats[resultFormat][0];

    return resultImageData;
  }

  /**
   * Overwrite internal module informations for proper output filename generation.
   * A hacky workaround until the module renaming Webpack API will be released.
   * See: https://github.com/webpack/webpack/issues/14851
   * 
   * @param {ImageData} resultImageData 
   * @param {String} finalPath 
   */
  updateModuleData(resultImageData, finalPath) {
    this.context.resourcePath = finalPath;
    this.context._module.matchResource = finalPath;

    const { buffer, ...imageInfo } = resultImageData;

    // Change content of the data URI after the conversion
    // Only if encodedContent was generated before (needs to update)
    if (
      this.context._module &&
      this.context._module.resourceResolveData &&
      this.context._module.resourceResolveData.encodedContent
    ) {
      this.context._module.resourceResolveData.encodedContent =
        buffer.toString("base64");
    }

    // update build meta information (whatever is it for)
    // todo: is it still needed? no docs available...
    if (this.context._module) {
      this.context._module.buildMeta = {
        ...this.context._module.buildMeta,
        infoOptimized: imageInfo
      };
    }
  }

  /**
   * Show debug info for the result image (if debug enabled).
   * 
   * @param {Srting} finalPath 
   * @param {String} cacheInfo 
   */
  showTimes(finalPath, cacheInfo) {
    if (this.options.debug) {
      const timeEnd = new Date();
      const timeElapsed = (timeEnd - this.timeStart) / 1000;
      const totalRunningTime = (timeEnd - LOADER_TIME_INIT) / 1000;

      this.debug(
        'done',
        `+${totalRunningTime}s ->`,
        path.basename(finalPath),
        `(${timeElapsed}s)`,
        (cacheInfo ? `- ${cacheInfo}` : '')
      );
    }
  }

  /**
   * A helper to write debug logs to console.
   * 
   * @param {String} topic - A prefix string (what's this info about)
   * @param  {...any} args - Arguments
   */
  debug(topic, ...args) {
    if (this.options.debug) {
      let loaderName = debugIsEmpty ? `\n[${LOADERNAME}]` : `[${LOADERNAME}]`;
      console.debug(loaderName, topic, ...args);
      debugIsEmpty = false;
    }
  }

  /**
   * Start processing the loader's input content
   * 
   * @returns {Promise<Buffer>}
   */
  async start() {
    // init eleventy dependencies (singleton promise, loads only once!)
    const deps = await peerDependencies(this.options);

    this.eleventyImg = deps.eleventyImg;
    this.eleventyCache = deps.eleventyCache;

    // get the buffer first we are going to optimize
    const inputBuffer = await (() => {
      if (this.fileInfo.isFetchFile) {
        return this.downloadImage(this.fileInfo.fetchData.url);
      } else {
        return this.content;
      }
    })();

    // init cache (failsafe!)
    const cache = await this.initCache(inputBuffer);

    // get result from cache or process the input buffer (optimize)
    const imageData = await (async () => {
      if (cache.imageDataFound) {
        return cache.imageDataFound;
      }

      const resultImageData = await this.processImageBuffer(inputBuffer);
      cache.save(resultImageData);
      return resultImageData;
    })();

    // finalize, debug
    const finalPath = this.fileInfo.finalPath(imageData);

    this.updateModuleData(imageData, finalPath);
    this.showTimes(finalPath, cache.debugInfo);
    
    return imageData.buffer;
  }
}

/**
 * The loader function which is called for every matched resource by Webpack
 * 
 * @this {LoaderContext}
 * @param {Buffer} content
 * @returns {Promise<Buffer | undefined>}
 */
module.exports = async function(content) {
  // set async mode first! (important for proper error handling)
  const callback = this.async();

  // http://json-schema.org/draft/2020-12/json-schema-validation.html
  const userOptions = this.getOptions(schema);

  new LoaderWorker(this, content, userOptions)
    .start()
    .then(resultImageBuffer => callback(null, resultImageBuffer))
    .catch(err => {
      if (err instanceof LoaderError && err.fatal) {
        throw err;
      }
      
      callback(err);
    });
};

// Webpack converts the input to a string, which is great for text files, but not for binaries.
// To get the contents without conversions, exports raw.
// With this, the source will be a Buffer with the file’s contents.
module.exports.raw = true;
