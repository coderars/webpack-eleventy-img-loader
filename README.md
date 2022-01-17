# webpack-eleventy-img-loader

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](./LICENSE)

Requires Node 12+ and Webpack 5+

This is an image loader built around [@11ty/eleventy-img][npm-eleventy-img] (uses [sharp](https://sharp.pixelplumbing.com/)) to convert and optimize images. With the power of [`eleventy-img`](https://www.11ty.dev/docs/plugins/image/#usage) this loader can also download (and cache) remote images - e.g. from your headless CMS - using [fetch files](#fetching-remote-images).

The purpose of this loader is to reduce dependencies for your [11ty](https://www.11ty.dev/) and [Webpack](https://webpack.js.org/) based projects. It'll use your existing 11ty packages, so there's no need for another image processor to handle images running through Webpack. Fewer dependencies mean faster builds.

>ℹ *Although `eleventy-img` can produce multiple output files for one input - with different formats and dimensions - the current version of this loader works in 1→1 mode (generates one file for one input).*

## Installation

```bash
npm install @szegheo/webpack-eleventy-img-loader --save-dev
```

### Required dependencies

>ℹ *This package has only `peerDependencies` as listed below, so probably you already have them in your 11ty based project — means no new dependencies will be installed in that case.*

- [webpack](https://www.npmjs.com/package/webpack) — version ^5.0.0
- [@11ty/eleventy-img][npm-eleventy-img] — version ^1.0.0 — *([see option](#eleventyimage))*
- [@11ty/eleventy-cache-assets][npm-eleventy-cache] — version ^2.3.0 — *([see option](#eleventycache))*

## Usage

A typical use case to extract images from CSS using Webpack 5 [Asset Modules](https://webpack.js.org/guides/asset-modules):

**webpack.config.js:**

```js
module.exports = {
  //...
  module: {
    rules: [
      //...
      {
        test: /\.(jpe?g|png|webp|avif|tiff|fetch)$/i,
        type: 'asset', // or 'asset/resource'
        generator: {
          // just for the example (can be omitted)
          filename: '[name]-[hash:8][ext]',
        },
        use: [
          {
            loader: 'webpack-eleventy-img-loader',
            options: {
              // rename output files (this will be used for [name] above)
              rename: '[oldname]-[width]w'
            }
          }
        ]
      },
      // MiniCssExtractPlugin.loader
      // css-loader
      // sass-loader
    ]
  }
};
```

**example.scss:**

```scss
section.demo {
  background-image: url('/assets/images/bg-demo.jpg?width=800');

  .webp & {
    background-image: url('/assets/images/bg-demo.jpg?width=800&format=webp');
  }
}
```

**output:**

```log
bg-demo-800w-968dc568.jpeg
bg-demo-800w-e3b326cf.webp
```

>ℹ *Please note that the loader always normalizes .jpg to .jpeg for the output files! This rule comes from eleventy-img and it is for reason.*

## Query params

By default the loader only does image optimization and keeps the original format. The following query paramteres can be used to set how the output image needs to be generated:

| Param  |        Accepts        | Description                           |
|--------|:---------------------:|---------------------------------------|
| `format` | `jpeg` \| `png` \| `webp` \| `avif` | Sets the format of the output image.  |
| `width`  | `number`                | Resize image to the given width.      |

**Example:**

```js
import image from './demo.jpg?width=800&format=webp';
```

>ℹ *The current version of [eleventy-img](https://www.11ty.dev/docs/plugins/image/) does not support other modifications like setting `height` or `cropping` but a [features request](https://github.com/11ty/eleventy-img/issues/31) has already been open. Additional parameters are expected to be added.*

## Options

| Name           |    Type    |   Default   | Descripton                                                                                                      |
|----------------|:----------:|:-----------:|-----------------------------------------------------------------------------------------------------------------|
| [`rename`](#rename)         |  `{String}`  | `'[oldname]'` | Rename mask for the output file, which will be the `[name]` placeholder for Asset Modules.                        |
| [`fetchFileExt`](#fetchfileext)   |  `{String}`  |   `'fetch'`   | Allows to overwrite the default extension for fetch files (JSON format containing the URL to the remote image). |
| [`beforeFetch`](#beforefetch)    | `{Function}` |  `undefined`  | Allows to modify URL and fetchOptions before fetching a remote image.                                           |
| [`sharpConfig`](#sharpconfig)    | `{Object}` |  `undefined`  | Allows to configure sharp optimization options for `eleventy-img`.                                           |
| [`cacheDownloads`](#cachedownloads) |  `{Boolean}` |    `false`    | Allow to store downloaded remote images in cacheDir.                                                            |
| [`cacheResults`](#cacheresults)   |  `{Boolean}` |    `false`    | Allow to store result (optimized) images in cacheDir.                                                           |
| [`cacheDir`](#cachedir)       |  `{String}`  |  `undefined`  | A path where cache files will be stored.                                            |
| [`cacheDuration`](#cacheduration)  |  `{String}`  |  `undefined`  | Sets how long a cached item (output result / fetched remote image) is valid.                                               |
| [`concurrency`](#concurrency)         |  `{Number}`  | `undefined` | Maximum number of concurrency optimization processes in one time.                        |
| [`fetchConcurrency`](#fetchconcurrency)         |  `{Number}`  | `undefined` | Maximum number of concurrency image downloads in one time.                        |
| [`eleventyImage`](#eleventyimage)         |  `{String\|Object}`  | `'@11ty/eleventy-img'` | Allows to manually provide dependency if needed for any reason.                        |
| [`eleventyCache`](#eleventycache)         |  `{String\|Object}`  | `'@11ty/eleventy-cache-assets'` | Allows to manually provide dependency if needed for any reason.                        |
| [`debug`](#debug)          |  `{Boolean}` |    `false`    | Use debug mode (detailed console logs).                                                                         |

### `rename`

Type: `{String}` Default: `'[oldname]'`

Adds the ability to rename output file. You can use the following - always available - placeholders:

- `[oldname]` - holds the original filename without the extension
- `[width]` - the final width of the output image
- `[height]` - the final height of the output image

**Example:**

 ```js
 '[oldname]-[width]x[height]'
 ```

>ℹ *For remote images `[oldname]` holds the name of the `fetch-file`, not the one found(?) in the url. Read more about [fetching remote images](#fetching-remote-images) using `.fetch` files.*

**Important:**

>⚠ **Do not use extension, path, subdir, or any other webpack specific placeholders here! Extension is generated automatically based on the mime type of the output file.**

### `fetchFileExt`

Type: `{String}` Default: `'fetch'`

A `.fetch` file is just a simple JSON file containing the `url` of the remote image. Using this option you can change its extension.

>ℹ *The value of this option must be in sync with your `Rule.test` config, otherwise the loader won't be able to process them! If you change it, change it there either.*

### `beforeFetch`

Type: `{Function}` Default: `undefined`

It's possible to change the request `url` and set options for [`node-fetch`](https://www.npmjs.com/package/node-fetch#options) before [fetching a remote image](#fetching-remote-images).

`function (imageUrl, resourcePath) => {String|URL|Object}`

| Param  | Type | Description |
|--------|:----:|-------------|
| `imageUrl` | `{String}` | The `url` of the remote image. |
| `resourcePath` | `{String}` | Local path to the current `.fetch` file. |

**Example: returning `{Srting}`**

```js
beforeFetch: (imageUrl, resourcePath) => {
  return imageUrl.replace('CMS-SERVER', 'myserver.example');
}
```

**Example: returning `{URL}`**

```js
beforeFetch: (imageUrl, resourcePath) => {
  let newURL = new URL(url);

  newURL.username = process.env.SECRET_USER;
  newURL.password = process.env.SECRET_PWD;
  newURL.searchParams.set('somekey', 'someval');

  return newURL;
}
```

**Example: returning `{Object}` with [`fetchOptions`](https://www.npmjs.com/package/node-fetch#options)**

```js
beforeFetch: (imageUrl, resourcePath) => {
  return {
    fetchUrl: imageUrl, // required {String|URL}
    fetchOptions: {
      // options for node-fetch
      method: 'GET'
    }
  };
}
```

### `sharpConfig`

Type: `{Object}` Default: `undefined`

Allows to configure sharp optimization options for `eleventy-img`. See ["ADVANCED CONTROL OF SHARP IMAGE PROCESSOR"](https://www.11ty.dev/docs/plugins/image/#advanced-control-of-sharp-image-processor). Defaults of [`sharp`](https://sharp.pixelplumbing.com/api-output) will be used otherwise.

**Example:**

```js
sharpConfig: {
  sharpJpegOptions: { mozjpeg: true, quality: 85, progressive: true }
}
```

### `cacheDownloads`

Type: `{Boolean}` Default: `false` Required options: [`cacheDir`](#cachedir), [`cacheDuration`](#cacheduration)

>⚠ *While this was well tested during development, please use it with caution and make your own tests first using the [`debug`](#debug) option!*

When enabled, the loader writes downloaded images to its permanent disk cache based on the full URL of the request (cache key). Next time, when a new build is started it validates the request URL against its cache. If the current image was found in the cache and it is not expired, it will use that instead downloading it again.

In case [when a fetch request fails](https://www.11ty.dev/docs/plugins/cache/#what-happens-with-a-request-fails) but a cache entry already exists (even if it’s expired), it will use the cached entry.

### `cacheResults`

Type: `{Boolean}` Default: `false` Required options: [`cacheDir`](#cachedir), [`cacheDuration`](#cacheduration)

>⚠ *While this was well tested during development, please use it with caution and make your own tests first using the [`debug`](#debug) option!*

When enabled, the loader writes generated images to its permanent disk cache. Next time, when a new build is started it validates input images and their parameters against the cache. When a cached item for this condition was found and it is not expired, that will be immediately returned to Webpack instead re-generating the same file.

The `cacheKey` is calculated using the hash sum of:

- the full `path` to the local resource file (image or fetch file with query params)
- options for `eleventy-img` (size, format, sharp config, etc)
- the `Buffer` holding binary content of the input image beeing processed

### `cacheDir`

Type: `{String}` Default: `undefined`

A path where cache files will be stored. Will be created if not exits.

### `cacheDuration`

Type: `{String}` Default: `undefined`

Sets how long a cached item (output result / fetched remote image) is valid. This option is used by `eleventy-cache-assets` [(original docs)](https://www.11ty.dev/docs/plugins/cache/#change-the-cache-duration).

**Example:**

```js
cacheDuration: "1d" // file expires after 1 day
```

**Where:**

- `s` is seconds
- `m` is minutes
- `h` is hours
- `d` is days
- `w` is weeks
- `y` is years

### `concurrency`

Type: `{Number}` Default: `undefined` *(see description)*

Sets the maximum number of concurrency optimization processes in one time. If set, this option is forwarded to `eleventy-img` [(see the docs)](https://www.11ty.dev/docs/plugins/image/#change-global-plugin-concurrency).

### `fetchConcurrency`

Type: `{Number}` Default: `undefined` *(see description)*

Maximum number of concurrency image downloads in one time. If set, this option is forwarded to `eleventy-cache-assets` [(see the docs)](https://www.11ty.dev/docs/plugins/cache/#change-global-plugin-concurrency).

### `eleventyImage`

Type: `{String|Object}` Default: `'@11ty/eleventy-img'`

Package [`@11ty/eleventy-img`][npm-eleventy-img] will be automatically loaded, but it's possible to set it manually if needed. Load it with `require` or give an exact `path` to the package.

### `eleventyCache`

Type: `{String|Object}` Default: `'@11ty/eleventy-cache-assets'`

Package [`@11ty/eleventy-cache-assets`][npm-eleventy-cache] will be automatically loaded, but it's possible to set it manually if needed. Load it with `require` or give an exact `path` to the package.

### `debug`

Type: `{Boolean}` Default: `false`

Logs useful debug information to console when enabled.

## Fetching remote images

Thanks to [`eleventy-img`](https://www.11ty.dev/docs/plugins/image/#caching-remote-images-locally-new-in-image-0.3.0) this loader can download (fetch) - and even [cache](#cachedownloads) - remote images on-the-fly using local `.fetch` files. Why is this good? Because using them you can work with remote images - *probably on your headles CMS server* - as they would real local images. Also you can safely add [query params](#query-params) to the `.fetch` file.

### Fetch files

- A `.fetch` file is just a simple `JSON` file with the `url` of the remote image.
- The `url` does not need to have a filename or extension.
- The `url` can be modified using the [`beforeFetch`](#beforefetch) option. *Do not store tokens or passwords in fetch files!*
- The `filename` of the `fetch` file will be used when naming the output file.
- The original `extension` is determined by the `MIME Type` of the fetched image.
- It's possible to change the default `"fetch"` extension using the  [`fetchFileExt`](#fetchfileext) option.

### Example

**my-cute-kitten.fetch:**

```json
{
  "url": "https://loremflickr.com/1920/1080/kitten?lock=777"
}
```

**example.css:**

```css
.example {
  background-image: url('/assets/images/my-cute-kitten.fetch?width=320');
}
```

**output:** (…using [`rename: '[oldname]-[width]w'`](#rename))

```console
my-cute-kitten-320w.jpeg
```

>👉 *In the example above the MIME Type of the remote image was `image/jpeg`, so the output format was kept unchanged because we didn't use the `format` [query param](#query-params) on the fetch file.*

## Tests

```shell
npm run test
```

- Uses the [ava JavaScript test runner](https://github.com/avajs/ava) ([Assertions documentation](https://github.com/avajs/ava/blob/master/docs/03-assertions.md))
- Requires internet connection to load remote test images (.fetch files)
- Uses [memfs](https://www.npmjs.com/package/memfs) to write output files to an in-memory file-system (except cache files).

## Contributing

This package uses [commitlint](https://commitlint.js.org/) to ensure proper commit messages. Please follow the rules declared in [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).

[npm]: https://img.shields.io/npm/v/@szegheo/webpack-eleventy-img-loader.svg
[npm-url]: https://www.npmjs.com/package/@szegheo/webpack-eleventy-img-loader
[node]: https://img.shields.io/node/v/@szegheo/webpack-eleventy-img-loader.svg
[node-url]: https://nodejs.org
[npm-eleventy-img]: https://www.npmjs.com/package/@11ty/eleventy-img
[npm-eleventy-cache]: https://www.npmjs.com/package/@11ty/eleventy-cache-assets
