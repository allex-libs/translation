function createLib (execlib) {
  'use strict';
  return {
    Translator: require('./translatorcreator')(execlib)
  };
}

module.exports = createLib;
