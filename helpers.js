// Shorthand helpers
class Helpers {
  static isEmpty(val) { return val == null || val == ''; }
  static notEmpty(val) { return this.isEmpty(val) === false; }
  static isPlainObject (obj) { return (obj ?? false)?.constructor?.name === "Object"; }
  static isStringNE (val) { return typeof val == 'string' && val.length > 0; }
}

// exports
module.exports = Helpers;