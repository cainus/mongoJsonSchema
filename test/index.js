var should = require('should');
var difflet = require('difflet');
var deepEqual = require('deep-equal');
var Schema = require('../index');
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var util = require('util');
var assert = require('assert');

var assertObjectEquals = function(actual, expected){
  if (!deepEqual(actual, expected)){
    process.stdout.write(difflet.compare(actual, expected));
    console.log("\n\nactual");
    console.log(util.inspect(actual));
    console.log("\n\nexpected");
    console.log(util.inspect(expected));
    console.log("\n\n");
    assert.fail(actual, expected);
    return false;
  }
  return true;
};

describe('mongoJsonSchema', function(){
  var schema = Schema({
    type : 'object',
    properties : {
      _id : {
        type: "objectid",
        required : true
      },
      nested : {
        type : 'object',
        properties : {
          sub : {
            type : "objectid"
          }
        }
      },
      count : {
        type : "number",
        required : false
      },
      participants : {
        type: "array",
        items: {
          type: "objectid",
        }
      },
      date : {
        type: "date"
      }
    },
    additionalProperties: false
  });
  describe("getObjectIdPaths", function(){
    it("retuns no paths for a number", function(){
      var actual = Schema({
        type : 'number',
        required : false
      }).getObjectIdPaths();
      assertObjectEquals(actual, []);
    });
    it("can get paths on a single id", function(){
      var actual = Schema({
        type : 'objectid',
        required : false
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        []
      ]);
    });
    it("can get paths on objects of ids", function(){
      var actual = Schema({
        type : 'object',
        properties : {
          kid : {
            type : "objectid"
          },
          kid2 : {
            type : "objectid"
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["kid"], ["kid2"]
      ]);
    });
    it("can get paths on arrays of ids", function(){
      var actual = Schema({
        type : 'array',
        items : {
          type : "objectid"
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["*"]
      ]);
    });
    it("can get paths on arrays of arrays of ids", function(){
      var actual = Schema({
        type : 'array',
        items : {
          type : 'array',
          items : {
            type : "objectid"
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["*", "*"]
      ]);
    });
    it("returns empty when nested arrays have no objectid", function(){
      var actual = Schema({
        type : 'array',
        items : {
          type : 'array',
          items : {
            type : "number"
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [ ]);
    });
    it("returns ids double nested in objects", function(){
      var actual = Schema({
        type : 'object',
        properties : {
          sub2 : {
            type: "object",
            properties: {
              sub3 : {
                type: "objectid",
                required : false
              }
            }
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["sub2", "sub3"]
      ]);
    });

    it("returns objectid paths", function(){
      var actual = schema.getObjectIdPaths();
      assertObjectEquals(actual, [
        ["_id"],
        ["nested", "sub"],
        ["participants", "*"]
      ]);
    });
    it("returns array nested objectid paths", function(){
      var actual = Schema({
        type : 'object',
        properties : {
          participants : {
            type: "array",
            items: {
              type: "object",
              properties : {
                subarr : {
                  type : "array",
                  items : {
                    type : "objectid"
                  }
                }
              }
            }
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["participants", "*", "subarr", '*']
      ]);
    });
  });
  describe("getDatePaths", function(){
    it("retuns no paths for a number", function(){
      var actual = Schema({
        type : 'number',
        required : false
      }).getDatePaths();
      assertObjectEquals(actual, []);
    });
    it("can get paths on a single date", function(){
      var actual = Schema({
        type : 'date',
        required : false
      }).getDatePaths();
      assertObjectEquals(actual, [
        []
      ]);
    });
    it("can get paths on objects of dates", function(){
      var actual = Schema({
        type : 'object',
        properties : {
          date1 : {
            type : "date"
          },
          date2 : {
            type : "date"
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["date1"], ["date2"]
      ]);
    });
    it("can get paths on arrays of dates", function(){
      var actual = Schema({
        type : 'array',
        items : {
          type : "date"
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["*"]
      ]);
    });
    it("can get paths on arrays of arrays of dates", function(){
      var actual = Schema({
        type : 'array',
        items : {
          type : 'array',
          items : {
            type : "date"
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["*", "*"]
      ]);
    });
    it("returns empty when nested arrays have no date", function(){
      var actual = Schema({
        type : 'array',
        items : {
          type : 'array',
          items : {
            type : "number"
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [ ]);
    });
    it("returns dates double nested in objects", function(){
      var actual = Schema({
        type : 'object',
        properties : {
          sub2 : {
            type: "object",
            properties: {
              sub3 : {
                type: "date",
                required : false
              }
            }
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["sub2", "sub3"]
      ]);
    });

    it("returns date paths", function(){
      var actual = schema.getDatePaths();
      assertObjectEquals(actual, [
        ["date"]
      ]);
    });
    it("returns array nested date paths", function(){
      var actual = Schema({
        type : 'object',
        properties : {
          participants : {
            type: "array",
            items: {
              type: "object",
              properties : {
                subarr : {
                  type : "array",
                  items : {
                    type : "date"
                  }
                }
              }
            }
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["participants", "*", "subarr", '*']
      ]);
    });
  });
  describe("validate", function(){
    it ("rejects bad data against the schema", function(done){
      try {
        schema.validate({
          _id : '52f044dee2896a8264d7ec2',  // bad id here
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          count : 42,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f'],
          date: new Date()
        });
      } catch (ex){
        ex.errors[0].message.should.equal('String does not match pattern');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects data with missing required fields", function(done){
      try {
        schema.validate({
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          count : 42,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f'],
          date : new Date()
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Property is required');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects data where dates are provided incorrectly", function(done) {
      try {
        schema.validate({
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          count : 42,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f'],
          date : "asdf"
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Incorrect date format - got asdf');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects data with extra fields (with additionalProperties set to false)", function(done) {
      try {
        schema.partialValidate({
          _id : '52f044dee2896a8264d7ec2f',
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          monkeys: 12,
          count : 42,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Additional properties are not allowed');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("accepts good data against the schema", function(done) {
      try {
          schema.validate({
          _id : '52f044dee2896a8264d7ec2f',
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          count : 42,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f'],
          date : new Date("2014-01-23T20:49:45.040Z")
        });
      }
      catch (ex) {
        throw new Error(ex.errors[0].message);
      }
      // partial data missing non-required fields.
      try {
        schema.validate({
          _id : '52f044dee2896a8264d7ec2f',
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
        });
      }
      catch (ex) {
        throw new Error(ex.errors[0].message);
      }
      done();
    });
  });

  describe("partialValidate", function() {
    it ("rejects bad data against the schema", function(done){
      try {
        schema.partialValidate({
          _id : '52f044dee2896a8264d7ec2',  // bad id here
        });
      } catch (ex){
        ex.errors[0].message.should.equal('String does not match pattern');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects data with extra fields (with additionalProperties set to false)", function(done) {
      try {
        schema.partialValidate({
          _id : '52f044dee2896a8264d7ec2f',
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          monkeys: 12,
          count : 42,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Additional properties are not allowed');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects data where dates are provided incorrectly", function(done) {
      try {
        schema.validate({
          date : "asdf"
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Incorrect date format - got asdf');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("does not reject data with missing required fields", function(done){
      schema.partialValidate({
        nested : {
          sub : '52f044dee2896a8264d7ec2f',
        },
        count : 42,
        participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f'],
        date: "2014-01-23T20:49:45.040Z"
      });
      done();
    });
    it ("does not reject entirely empty data", function(done) {
      var actual = schema.partialValidate({});
      done();
    });
  });

  describe("idsToStrings", function(){
    it ("validates and returns ids as strings", function(done){
      var actual = schema.idsToStrings({
        _id : ObjectID('52f044dee2896a8264d7ec2f'),
        nested : {
          sub : ObjectID('52f044dee2896a8264d7ec2f'),
        },
        count : 42,
        participants : [ObjectID('52f044dee2896a8264d7ec2f'),ObjectID('52f044dee2896a8264d7ec2f')]
      });
      assertObjectEquals(actual, {
        _id : '52f044dee2896a8264d7ec2f',
        nested : {
          sub : '52f044dee2896a8264d7ec2f',
        },
        count : 42,
        participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
      });
      done();
    });
  });

  describe("stringsToIds", function(){
    it ("returns objectid strings as ids", function(done){
      var actual = schema.stringsToIds({
        _id : '52f044dee2896a8264d7ec2f',
        nested : {
          sub : '52f044dee2896a8264d7ec2f',
        },
        count : 42,
        participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
      });
      assertObjectEquals(actual, {
        _id : ObjectID('52f044dee2896a8264d7ec2f'),
        nested : {
          sub : ObjectID('52f044dee2896a8264d7ec2f'),
        },
        count : 42,
        participants : [ObjectID('52f044dee2896a8264d7ec2f'),ObjectID('52f044dee2896a8264d7ec2f')]
      });
      done();
    });
    it ("returns objectid strings or objectids as objectids", function(done){
      var actual = schema.stringsToIds({
        _id : '52f044dee2896a8264d7ec2f',
        nested : {
          sub : ObjectID('52f044dee2896a8264d7ec2f'),
        },
        count : 42,
        participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
      });
      assertObjectEquals(actual, {
        _id : ObjectID('52f044dee2896a8264d7ec2f'),
        nested : {
          sub : ObjectID('52f044dee2896a8264d7ec2f'),
        },
        count : 42,
        participants : [ObjectID('52f044dee2896a8264d7ec2f'),ObjectID('52f044dee2896a8264d7ec2f')]
      });
      done();
    });
  });
  describe("getJsonSchema", function(){
    it ("converts objectid to string with regex", function(done){
      var actual = schema.getJsonSchema();
      assertObjectEquals(actual, {
        type : 'object',
        properties : {
          _id : {
            type: "string",
            pattern : "^[a-fA-F0-9]{24}$",
            required : true
          },
          nested : {
            type : 'object',
            properties : {
              sub : {
                type: "string",
                pattern : "^[a-fA-F0-9]{24}$",
              }
            }
          },
          count : {
            type : "number",
            required : false
          },
          participants : {
            type: "array",
            items: {
              type: "string",
              pattern : "^[a-fA-F0-9]{24}$"
            }
          },
          date : {
            type: 'string',
            pattern: '(\\d\\d\\d\\d)(-)?(\\d\\d)(-)?(\\d\\d)(T)?(\\d\\d)(:)?(\\d\\d)(:)?(\\d\\d)(\\.\\d+)?(Z|([+-])(\\d\\d)(:)?(\\d\\d))'
          },
        },
        additionalProperties: false
      });
      done();
    });
  });
});
