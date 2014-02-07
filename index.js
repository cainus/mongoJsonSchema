var traverse = require('traverse');
var _ = require('underscore');
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var JSV = require('JSV').JSV;

var Schema = function(jsonSchema){
  if (!(this instanceof Schema)) {
    return new Schema(jsonSchema);
  }
  this._schema = jsonSchema;
  this._jsonSchema = toJsonSchema(jsonSchema);
  this._partialJsonSchema = toPartialJsonSchema(this._jsonSchema);
  this.jsonValidator = JSV.createEnvironment().createSchema(this._jsonSchema);
  this.partialJsonValidator = JSV.createEnvironment().createSchema(this._partialJsonSchema);
};

var toJsonSchema = function(schema){
  var standard = traverse(schema).map(function(value){
    if (value.type && (value.type === 'objectid')){
      value.type = 'string';
      value.pattern = /^[a-fA-F0-9]{24}$/.source;
    }
    return value;
  });
  return standard;
};

var toPartialJsonSchema = function(schema) {
  var partial = traverse(schema).map(function(value) {
    if (value.required) {
      delete value.required;
    }
    return value;
  });
  return partial;
};

Schema.prototype.getJsonSchema = function(){
  return this._jsonSchema;
};

Schema.prototype.idsToStrings = function(obj){
  var paths = this.getObjectIdPaths();
  var that = this;
  paths.forEach(function(path){
    obj = that.pathApply(obj, path, function(item){
      return item.toString();
    });
  });
  return obj;
};

Schema.prototype.stringsToIds = function(obj){
  var paths = this.getObjectIdPaths();
  var that = this;
  paths.forEach(function(path){
    obj = that.pathApply(obj, path, function(item){
      if (item instanceof ObjectID){
        return item;
      }
      if (_.isString(item)){
      return ObjectID(item);
      }
    });
  });
  return obj;
};


var isSet = function(obj){
  return ((obj !== null) && (obj !== undefined));
};

Schema.prototype.pathApply = function(obj, path, fn){
  var that = this;
  if (!isSet(obj)){
    throw new Error("argument error: obj was null");
  }
  if (!_.isArray(path)){
    throw new Error("argument error: path was not an array: " + path);
  }
  if (path.length === 0){
    return fn(obj);
  }
  var prop = path.shift();
  if (prop === '*'){
    prop = path.shift();
    // it's an array!
    if (_.isArray(obj)){
      obj = obj.map(function(item){
        return that.pathApply(item, path, fn);
      });
    }
  } else {
    var newObj = obj[prop];
    if (newObj){
      obj[prop] = this.pathApply(newObj, path, fn);
    }
  }
  return obj;
};


Schema.prototype.validate = function(obj){
  obj = this.idsToStrings(obj);
  var report = this.jsonValidator.validate(obj);
  if (report.errors.length > 0){
    var err = new Error("JsonSchema validation error");
    err.errors = report.errors;
    err.name = "JsonSchemaValidationError";
    throw err;
  }
  return this;
};

Schema.prototype.partialValidate = function(obj){
  obj = this.idsToStrings(obj);
  var report = this.partialJsonValidator.validate(obj);
  if (report.errors.length > 0){
    var err = new Error("JsonSchema validation error");
    err.errors = report.errors;
    err.name = "JsonSchemaValidationError";
    throw err;
  }
  return this;
};

Schema.prototype.getObjectIdPaths = function(prefix, schema){
  if (!prefix){
    prefix = [];
  }
  if (!schema){
    schema = this._schema;
  }
  var that = this;
  switch(schema.type){

    case 'object':
      var paths = [];
      var subpaths;
      _.each(schema.properties, function(v, k){
        switch(v.type){
          case 'object':
            subpaths = that.getObjectIdPaths(_.flatten([prefix, k]), v);
            paths = paths.concat(subpaths);
            break;
          case 'array':
            subpaths = that.getObjectIdPaths(_.flatten([prefix, k, '*']), v.items);
            paths = paths.concat(subpaths);
            break;
          case 'objectid':
            paths.push(_.flatten([prefix, k]));
            break;
        }
      });
      return paths;

    case 'objectid':
      // there's only one path here, so return it as an array
      return([_.flatten(prefix)]);

    case 'array':
      // we're not done here, so mark it as an array and recurse
      prefix.push('*');
      return that.getObjectIdPaths(prefix, schema.items);

    default :
      // there are no paths to return.
      return [];

  }
};

var pretty = function(obj){
  return JSON.stringify(obj, null, 2);
};

module.exports = Schema;
