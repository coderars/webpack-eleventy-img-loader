# webpack-eleventy-img-loader

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](./LICENSE)

⚠ THIS PACKAGE IS UNDER HEAVY DEVELOPMENT ⚠ USE WITH CAUTION ⚠

ℹ I'm going to release the production-ready v1.0.0 soon. ℹ

Requires Node 12+

Webpack 5 image loader built around [@11ty/eleventy-img](https://www.npmjs.com/package/@11ty/eleventy-img) (uses [sharp](https://sharp.pixelplumbing.com/)) to convert and optimize images.

The purpose of this loader is to reduce dependencies for your [11ty](https://www.11ty.dev/) and [Webpack](https://webpack.js.org/) based projects. It'll use your existing 11ty packages, so there's no need for another image processor to handle images running through Webpack. Fewer dependencies mean faster builds.

## Installation
```
npm install webpack-eleventy-img-loader
```

### Required dependencies

This package does not install any new dependency. It assumes you already have the following packages installed in your project:

- [webpack](https://www.npmjs.com/package/webpack) - version ^5.0.0
- [@11ty/eleventy-img](https://www.npmjs.com/package/@11ty/eleventy-img) - version ^1.0.0
- [@11ty/eleventy-cache-assets](https://www.npmjs.com/package/@11ty/eleventy-cache-assets) - version ^2.3.0

## Usage

A typical use case would look like this using Webpack 5 [Asset Modules](https://webpack.js.org/guides/asset-modules):

**webpack.config.js**
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

Let's say you want to use it with SASS and you have some script which detects webp support:

**example.scss**
```scss
section.hero {
  background-image: url('/assets/images/bg-hero.jpg?width=800');

  .webp & {
    background-image: url('/assets/images/bg-hero.jpg?width=800&format=webp');
  }
}
```
**output**

When Webpack builds your project, you will have these files in your output dir (and the final css will refer to them of course):

- bg-hero-800w-968dc568.jpeg
- bg-hero-800w-e3b326cf.webp

ℹ *Please note that the loader always normalizes .jpg to .jpeg for the output files! This rule comes from eleventy-img and it is for reason.*

## Query params

By default the loader only does image optimization and keeps the original format. The following query paramteres can be used to set how the output image needs to be generated:

| Param  | Accepts               | Description                           |
|--------|-----------------------|---------------------------------------|
| `format` | `jpeg` \| `png` \| `webp` \| `avif` | Sets the format of the output image.  |
| `width`  | number                | Resize image to the given width.      |

ℹ *The current version of [eleventy-img](https://www.11ty.dev/docs/plugins/image/) does not support other modifications like setting `height` or `cropping` but a [features request](https://github.com/11ty/eleventy-img/issues/31) has already been open.*

## Options

| Name           |    Type    |   Default   | Descripton                                                                                                      |
|----------------|:----------:|:-----------:|-----------------------------------------------------------------------------------------------------------------|
| [`rename`](#rename)         |  `{String}`  | `'[oldname]'` | Rename mask for the output file, which will be the [name] placeholder for Asset Modules.                        |
| [`fetchFileExt`](#fetchFileExt)   |  `{String}`  |   `'fetch'`   | Allows to overwrite the default extension for fetch files (JSON format containing the URL to the remote image). |
| [`beforeFetch`](#beforeFetch)    | `{Function}` |  `undefined`  | Allows to modify URL and fetchOptions before fetching a remote image.                                           |
| [`cacheDownloads`](#cacheDownloads) |  `{Boolean}` |    `false`    | Allow to store downloaded remote images in cacheDir.                                                            |
| [`cacheResults`](#cacheResults)   |  `{Boolean}` |    `false`    | Allow to store result (optimized) images in cacheDir.                                                           |
| [`cacheDir`](#cacheDir)       |  `{String}`  |  `undefined`  | A path where cache files will be stored (absolute path recommended).                                            |
| [`cacheDuration`](#cacheDuration)  |  `{String}`  |  `undefined`  | Sets how long a cached item (optimization/fetch result) is valid.                                               |
| [`debug`](#debug)          |  `{Boolean}` |    `false`    | Use debug mode (detailed console logs).                                                                         |

### `rename`

Type: `{String}` Default: `'[oldname]'`

Adds the ability to rename output file. You can use the following - always available - placeholders:

- `[oldname]` - holds the original filename without the extension
- `[width]` - the final width of the output image
- `[height]` - the final height of the output image

Example: `'[oldname]-[width]x[height]'`

ℹ *For remote images `[oldname]` holds the name of the `fetch-file`, not the one found(?) in the url. Read more about [fetching remote images](#fetching-remote-images) using `.fetch` files.*

**Important: Do not use extension, path, subdir, or any other webpack specific placeholders here! Extension is generated automatically based on the mime type of the output file.**

### `fetchFileExt`
### `beforeFetch`
### `cacheDownloads`
### `cacheResults`
### `cacheDir`
### `cacheDuration`
### `debug`

## Fetching remote images

## Tests
```
npm run test
```
- Uses the [ava JavaScript test runner](https://github.com/avajs/ava) ([Assertions documentation](https://github.com/avajs/ava/blob/master/docs/03-assertions.md))
- Requires internet connection to load remote test images (.fetch files)
- Uses [memfs](https://www.npmjs.com/package/memfs) to write output files to an in-memory file-system (except cache files).

## Contributing

This package uses [commitlint](https://commitlint.js.org/) to ensure proper commit messages. Please follow the rules declared in [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional).
