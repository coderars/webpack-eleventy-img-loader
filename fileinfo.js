const path = require("path");
const util = require('util');
const assert = require('assert');
const { createHash } = require("crypto");
const LoaderError = require('./error');

// shorthand helpers
const { isEmpty } = require('./helpers');

class FileInfo {
  /**
   * @param {String} resource
   * @param {Buffer} content 
   * @param {Object} options 
   */
  constructor(resource, content, options) {
    this.content = content;
    this.resource = resource;
    this.options = options;

    this.URL = new URL(this.resource, 'file:');
  }

  // get a parameter value as String from resource query
  // returns String or Null if param is empty
  getParam(p, format = '%s') {
    let value = this.URL.searchParams.get(p);

    return isEmpty(value) ? null : util.format(format, value);
  }

  get resourceId() {
    return createHash('md4').update(this.resource).digest('hex');
  } 

  get isFetchFile() {
    return this.fromExt.toLowerCase() === this.options.fetchFileExt.toLowerCase();
  }

  get fetchData() {
    let result = null;

    if (this.isFetchFile) {
      try {
        result = JSON.parse(this.content.toString());

        // check required keys
        assert.ok(result.url, 'Empty or missing url key!');
        assert.ok(new URL(result.url));

      } catch (err) {
        throw new LoaderError(`Error parsing fetch file.`, err);
      }
    }

    return result;
  }

  get fromPath() { return this.URL.pathname; }
  get fromParams() { return this.URL.searchParams; }
  get fromExt() { return path.extname(this.fromPath).split('.').pop(); }

  get toWidth() { return this.getParam('width'); }
  get toHeight() { return this.getParam('height'); }

  get toFormat() {
    // get output file extension (return null means keep original)
    let format = this.getParam('format');

    if (format) {
      // normalize format/extension (lowercase, jpg to jpeg)
      format = (ext => ext === 'jpg' ? 'jpeg' : ext)(format.toLowerCase());
    }
    
    return format;
  }

  finalPath(resultFileData = {}) {
    const p = path.parse(this.fromPath);

    if (!resultFileData?.format) {
      throw new LoaderError(`Result file data has no "format" information.`);
    }

    const newName = this.options.rename
      .replace("[oldname]", p.name)
      .replace("[width]", resultFileData.width ?? '')
      .replace("[height]", resultFileData.height ?? '');

    return path.format({
      dir: p.dir,
      name: newName,
      ext: util.format('.%s', resultFileData.format)
    });
  }

  get info() {
    return {
      fromResource: this.resource,
      fromPath: this.fromPath,
      fromQuery: this.fromParams,
      fromExt: this.fromExt,
      toFormat: this.toFormat,
      toWidth: this.toWidth,
      toHeight: this.toHeight
    };
  }
}

module.exports = FileInfo;