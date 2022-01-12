// https://github.com/avajs/ava/blob/main/docs/03-assertions.md#built-in-assertions
const test = require("ava");
const path = require("path");
const fs = require("fs");
const runWebpack = require('./helpers/webpack-runner');
const filetype = require("file-type"); // stick to v16 !! (esm only from v17)

const cacheDir = (subfolder) => path.resolve(__dirname, '.cache', subfolder || '');

/** @typedef {import("ava").Assertions} Assertions */

/**
 * Common tests for the given resource
 * 
 * @param {Assertions} t 
 * @param {Object} input 
 * 
 * https://github.com/avajs/ava/blob/main/docs/03-assertions.md#built-in-assertions
 * https://github.com/avajs/ava/blob/main/docs/01-writing-tests.md#reusing-test-logic-through-macros
 */
async function macro(t, input) {
  const { testResource, loaderOptions, expectedFilename, expectedMime } = input;

  const { assets, memFs } = await runWebpack(testResource, loaderOptions);

  if (input?.debug || loaderOptions?.debug) {
    console.debug(`Webpack generated assets for "${testResource}" was:`, assets);
  }

  t.true(expectedFilename in assets);
  t.true(memFs.existsSync('/' + expectedFilename));

  const ftype = await filetype.fromStream(memFs.createReadStream('/' + expectedFilename));

  t.is(ftype.mime, expectedMime);

  if (input?.afterPassed && t.passed) {
    input.afterPassed(t, input, assets, memFs);
  }
}

/**
 * PEERDEPENDENCIES TEST
 */

test('PeerDependenncies manually as require', macro, {
  testResource: './images/test.jpg',
  loaderOptions: {
    rename: 'peerdeps-require',
    concurrency: 4,
    fetchConcurrency: 4,
    eleventyImage: require('@11ty/eleventy-img'),
    eleventyCache: require('@11ty/eleventy-cache-assets'),
  },
  expectedFilename: 'peerdeps-require.jpeg',
  expectedMime: 'image/jpeg',
});

/**
 * LOCAL IMAGE TESTS
 */

test('Local image optimization without query params', macro, {
  testResource: './images/test.jpg',
  expectedFilename: 'test.jpeg',
  expectedMime: 'image/jpeg'
});

test("Local image convert jpg to webp", macro, {
  testResource: './images/test.jpg?format=webp',
  expectedFilename: 'test.webp',
  expectedMime: 'image/webp'
});

test("Local image convert jpg to webp, resize query, rename option", macro, {
  testResource: './images/test.jpg?format=webp&width=800',
  loaderOptions: {
    rename: '[oldname]-[width]w'
  },
  expectedFilename: 'test-800w.webp',
  expectedMime: 'image/webp'
});

/**
 * REMOTE IMAGE TESTS (fetch files)
 */

test("Remote image (unknown format) convert to webp, resize query, rename option", macro, {
  testResource: './images/remote.fetch?format=webp&width=320',
  loaderOptions: {
    rename: 'test-[oldname]-[width]w'
  },
  expectedFilename: 'test-remote-320w.webp',
  expectedMime: 'image/webp'
});

test("Remote image options.beforeFetch - return URL", macro, {
  testResource: './images/beforeFetch.fetch?format=jpeg',
  loaderOptions: {
    rename: '[oldname]-URL',
    beforeFetch: (url, resource) => {
      let newURL = new URL(url);
      newURL.searchParams.set('lock', '1');
      return newURL;
    }
  },
  expectedFilename: 'beforeFetch-URL.jpeg',
  expectedMime: 'image/jpeg'
});

test("Remote image options.beforeFetch - return url string", macro, {
  testResource: './images/beforeFetch.fetch?format=jpeg',
  loaderOptions: {
    rename: '[oldname]-url-string',
    beforeFetch: (url, resource) => {
      return `${url}?lock=2`;
    }
  },
  expectedFilename: 'beforeFetch-url-string.jpeg',
  expectedMime: 'image/jpeg'
});

test("Remote image options.beforeFetch - return Object", macro, {
  testResource: './images/beforeFetch.fetch?format=jpeg',
  loaderOptions: {
    rename: '[oldname]-object',
    beforeFetch: (url, resource) => {
      return {
        fetchUrl: `${url}?lock=3`,
        fetchOptions: {
          method: 'GET'
        }
      };
    }
  },
  expectedFilename: 'beforeFetch-object.jpeg',
  expectedMime: 'image/jpeg'
});

test("Remote image options.beforeFetch - return Promise", macro, {
  testResource: './images/beforeFetch.fetch?format=jpeg',
  loaderOptions: {
    rename: '[oldname]-promise',
    beforeFetch: (url, resource) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let newURL = new URL(url);
          newURL.searchParams.set('lock', '4');

          resolve({
            fetchUrl: newURL,
            fetchOptions: {
              method: 'GET'
            }
          });
        }, 500);
      });
    }
  },
  expectedFilename: 'beforeFetch-promise.jpeg',
  expectedMime: 'image/jpeg'
});

test("Remote image options.fetchFileExt - use .rimg instead .fetch (default)", macro, {
  // remember: the new extension must be added to your Webpack config (Rule.test)
  // .rimg is already listed in our webpack runner helper!
  testResource: './images/fetchFileExt.rimg?format=jpeg',
  loaderOptions: {
    fetchFileExt: 'rimg'
  },
  expectedFilename: 'fetchFileExt.jpeg',
  expectedMime: 'image/jpeg'
});

/**
 * CACHE TESTS (cache downloads and results)
 */

test("Cache test for image download and result caching (convert, resize)", macro, {
  testResource: './images/cache.fetch?format=webp&width=320',
  loaderOptions: {
    rename: 'cache-remote-[width]',
    cacheDownloads: true,
    cacheResults: true,
    cacheDir: cacheDir(),
    cacheDuration: '1d'
  },
  expectedFilename: 'cache-remote-320.webp',
  expectedMime: 'image/webp',

  afterPassed: (t, input) => {
    const cacheFiles = fs.readdirSync(input.loaderOptions.cacheDir);
    t.is(cacheFiles.length, 4);
  }
});

// test.todo('Write more/better tests for testing cache.');