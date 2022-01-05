class WebpackEleventyImgLoaderError extends Error {
  /**
   * @param {string} message - The error message to display.
   * @param {Error} [originalError] - The original error catched (optional).
   */
  constructor(message, originalError) {
    super(originalError ? `${message} *** ${originalError.message}` : message);

    /** @type {string} - The error message to display. */
    this.name = this.constructor.name;

    /** @type {boolean} - Fatal throws immediately, otherwise the error goes to the loader's error callback (log). */
    this.fatal = false;

    Error.captureStackTrace(this, this.constructor);

    if (originalError) {
      /** @type {Error} - The original error catched. */
      this.originalError = originalError;
    }
  }

  /**
   * Mark error as fatal (throw it instead using the loader's error callback (logging errors))
   */
  setFatal() {
    this.fatal = true;
    return this;
  }
}

module.exports = WebpackEleventyImgLoaderError;