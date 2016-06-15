function createTranslator(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    JobBase = qlib.JobBase;

  function Translator(vocabularysink, language, merge) {
    if (!vocabularysink) {
      throw new qlib.Error('NEED_A_VOCABULARY_SINK', sink);
    }
    JobBase.call(this);
    this.vocabularysink = vocabularysink;
    this.language = language;
    this.merge = merge;
    this.translating = false;
    this.resulter = this.takeResult.bind(this);
    this.rejecter = this.reject.bind(this);
  }
  lib.inherit(Translator, JobBase);
  Translator.prototype.destroy = function () {
    this.rejecter = null;
    this.resulter = null;
    this.translating = null;
    this.merge = null;
    this.language = null;
    this.vocabularysink = null;
    JobBase.prototype.destroy.call(this);
  };
  Translator.prototype.go = function (thingy) {
    var res;
    if (this.translating) {
      throw new lib.Error('ALREADY_TRANSLATING');
    }
    res = {result: thingy};
    this.translating = true;
    this.process(res, 'result', res).then(
      this.finalResolver.bind(this, res)
    );
    return this.defer.promise;
  };
  Translator.prototype.finalResolver = function (resobj) {
    this.resolve(resobj.result);
  };
  function propertysetter(merge, obj, key) {
    return function (val) {
      if (!obj) {
        return;
      }
      var ret = obj;
      if (merge) {
        obj[key] = {generic: obj[key], translation: val};
      } else {
        obj[key] = val;
      }
      merge = null;
      obj = null;
      key = null;
      return q(ret);
    };
  }
  function propertyvalsetter(obj, key, val) {
    return function () {
      if (!obj) {
        return;
      }
      var ret = obj;
      obj[key] = val;
      obj = null;
      key = null;
      val = null;
      return q(ret);
    };
  }
  Translator.prototype.rejectBecauseNonTranslatable = function (thingy) {
    this.reject(new lib.Error('NOT_TRANSLATABLE', thingy));
  };
  Translator.prototype.process = function (src, key, dest) {
    var thingy = src[key], promises;
    if (thingy === null) {
      this.rejectBecauseNonTranslatable(thingy);
      return;
    }
    if (lib.isNumber(thingy)) {
      return this.translate(thingy+'').then(propertysetter(this.merge,dest,key));
    }
    if (lib.isString(thingy)) {
      return this.translate(thingy).then(propertysetter(this.merge,dest,key));
    }
    if (lib.isArray(thingy)) {
      promises = thingy.map(this.arrayElementTranslator.bind(this));
      src = null;
      key = null;
      dest = null;
      return q.all(promises).then(propertyvalsetter(dest, key, thingy));
    }
    if ('object' === typeof thingy) {
      promises = [];
      lib.traverseShallow(thingy, this.objectPropertyTranslator.bind(this, promises, thingy));
      return q.all(promises).then(propertyvalsetter(dest, key, thingy));
    }
    this.rejectBecauseNonTranslatable(thingy);
  };
  Translator.prototype.arrayElementTranslator = function (thingy, index, arry) {
    return this.process(arry, index, arry);
  };
  Translator.prototype.objectPropertyTranslator = function (promises, obj, prop, propname) {
    promises.push(
      this.process(obj, propname, obj)
    );
  };
  var _id = 0;
  Translator.prototype.translate = function (item) {
    var dataobj = {id: ++_id, result: null};
    return this.vocabularysink.sessionCall('query', {filter:{
      op: 'and',
      filters: [{
        op: 'eq',
        field: 'generic',
        value: item
      },{
        op: 'eq',
        field: 'language',
        value: this.language
      }]
    }}).then(
      this.takeResult.bind(this, dataobj),
      null,
      this.takeData.bind(this, dataobj)
    );
  };
  Translator.prototype.takeResult = function (dataobj, result) {
    return q(dataobj.result);
  };
  Translator.prototype.takeData = function (dataobj, data) {
    if (lib.isArray(data) && data[0] === 'r1') {
      data = data[2];
      if (data.hasOwnProperty('translation')) {
        dataobj.result = data.translation;
      }
    }
  };

  return Translator;
}

module.exports = createTranslator;
