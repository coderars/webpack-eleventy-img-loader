# webpack-eleventy-img-loader

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](./LICENSE)

⚠ THIS PACKAGE IS UNDER HEAVY DEVELOPMENT ⚠ USE WITH CAUTION ⚠

ℹ I'm going to release a production-ready version soon. ℹ

Requires Node 12+

Webpack 5 image loader built around [@11ty/eleventy-img](https://www.npmjs.com/package/@11ty/eleventy-img) (uses [sharp](https://sharp.pixelplumbing.com/)) to convert and optimize images. With the power of [`eleventy-img`](https://www.11ty.dev/docs/plugins/image/#usage) this loader can also download (and cache) remote images - e.g. from your headless CMS - via [fetch files](#fetching-remote-images).

The purpose of this loader is to reduce dependencies for your [11ty](https://www.11ty.dev/) and [Webpack](https://webpack.js.org/) based projects. It'll use your existing 11ty packages, so there's no need for another image processor to handle images running through Webpack. Fewer dependencies mean faster builds.

## Installation

```shell
npm install webpack-eleventy-img-loader --save-dev
```

### Required dependencies

> ⚠ **This package does not install any new dependency. It assumes you already have the following packages installed in your project:**

- [webpack](https://www.npmjs.com/package/webpack) — version ^5.0.0
- [@11ty/eleventy-img](https://www.npmjs.com/package/@11ty/eleventy-img) — version ^1.0.0 — *([see option](#eleventyimage))*
- [@11ty/eleventy-cache-assets](https://www.npmjs.com/package/@11ty/eleventy-cache-assets) — version ^2.3.0 — *([see option](#eleventycache))*

## Usage

A typical use case would look like this using Webpack 5 [Asset Modules](https://webpack.js.org/guides/asset-modules):

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

>ℹ *The current version of [eleventy-img](https://www.11ty.dev/docs/plugins/image/) does not support other modifications like setting `height` or `cropping` but a [features request](https://github.com/11ty/eleventy-img/issues/31) has already been open.*

## Options

| Name           |    Type    |   Default   | Descripton                                                                                                      |
|----------------|:----------:|:-----------:|-----------------------------------------------------------------------------------------------------------------|
| [`rename`](#rename)         |  `{String}`  | `'[oldname]'` | Rename mask for the output file, which will be the `[name]` placeholder for Asset Modules.                        |
| [`fetchFileExt`](#fetchfileext)   |  `{String}`  |   `'fetch'`   | Allows to overwrite the default extension for fetch files (JSON format containing the URL to the remote image). |
| [`beforeFetch`](#beforefetch)    | `{Function}` |  `undefined`  | Allows to modify URL and fetchOptions before fetching a remote image.                                           |
| [`sharpConfig`](#sharpconfig)    | `{Object}` |  `undefined`  | Allows to configure sharp optimization options for `eleventy-img`.                                           |
| [`cacheDownloads`](#cachedownloads) |  `{Boolean}` |    `false`    | Allow to store downloaded remote images in cacheDir.                                                            |
| [`cacheResults`](#cacheresults)   |  `{Boolean}` |    `false`    | Allow to store result (optimized) images in cacheDir.                                                           |
| [`cacheDir`](#cachedir)       |  `{String}`  |  `undefined`  | A path where cache files will be stored (absolute path recommended).                                            |
| [`cacheDuration`](#cacheduration)  |  `{String}`  |  `undefined`  | Sets how long a cached item (optimization/fetch result) is valid.                                               |
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

Type: `{Boolean}` Default: `false`

>⚠ *While this was well tested during development, please use it with caution and make your own tests first using the [`debug`](#debug) option!*

When enabled, the loader writes downloaded images to its permanent disk cache based on the full URL of the request (cache key). Next time, when a new build is started it validates the request URL against its cache. If the current image was found in the cache and it is not expired, it will use that instead downloading it again.

In case [when a fetch request fails](https://www.11ty.dev/docs/plugins/cache/#what-happens-with-a-request-fails) but a cache entry already exists (even if it’s expired), it will use the cached entry.

### `cacheResults`

### `cacheDir`

### `cacheDuration`

### `concurrency`

Type: `{Number}` Default: `undefined` *(see description)*

Sets the maximum number of concurrency optimization processes in one time. If set, this option is forwarded to `eleventy-img` [(see the docs)](https://www.11ty.dev/docs/plugins/image/#change-global-plugin-concurrency).

### `fetchConcurrency`

Type: `{Number}` Default: `undefined` *(see description)*

Maximum number of concurrency image downloads in one time. If set, this option is forwarded to `eleventy-cache-assets` [(see the docs)](https://www.11ty.dev/docs/plugins/cache/#change-global-plugin-concurrency).

### `eleventyImage`

Type: `{String|Object}` Default: `'@11ty/eleventy-img'`

Package [`@11ty/eleventy-img`](https://www.npmjs.com/package/@11ty/eleventy-img) will be automatically loaded, but it's possible to set it manually if needed. Load it with `require` or give an exact `path` to the package.

### `eleventyCache`

Type: `{String|Object}` Default: `'@11ty/eleventy-cache-assets'`

Package [`@11ty/eleventy-cache-assets`](https://www.npmjs.com/package/@11ty/eleventy-cache-assets) will be automatically loaded, but it's possible to set it manually if needed. Load it with `require` or give an exact `path` to the package.

### `debug`

## Fetching remote images

## Tests

```shell
npm run test
```

- Uses the [ava JavaScript test runner](https://github.com/avajs/ava) ([Assertions documentation](https://github.com/avajs/ava/blob/master/docs/03-assertions.md))
- Requires internet connection to load remote test images (.fetch files)
- Uses [memfs](https://www.npmjs.com/package/memfs) to write output files to an in-memory file-system (except cache files).

## Contributing

This package uses [commitlint](https://commitlint.js.org/) to ensure proper commit messages. Please follow the rules declared in [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).
