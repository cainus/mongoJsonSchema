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
      required : true
    },
    participants : {
      type: "array",
      items: {
        type: "objectid"
      }
    },
    date : {
      type: "date"
    }
  });
  describe("getObjectIdPaths", function(){
    it("can get paths on objects of ids", function(){
      var actual = Schema({
        kid : {
          type : "objectid"
        },
        kid2 : {
          type : "objectid"
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["kid"], ["kid2"], ["_id"]
      ]);
    });
    it("can get paths on arrays of ids", function(){
      var actual = Schema({
        arr: {
          type : 'array',
          items : {
            type : "objectid"
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["arr", "*"], ["_id"]
      ]);
    });
    it("can get paths on arrays of arrays of ids", function(){
      var actual = Schema({
        arr: {
          type : 'array',
          items : {
            type : 'array',
            items : {
              type : "objectid"
            }
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["arr", "*", "*"], ["_id"]
      ]);
    });
    it("returns only the main id when nested arrays have no objectid", function(){
      var actual = Schema({
        arr: {
          type : 'array',
          items : {
            type : 'array',
            items : {
              type : "number"
            }
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [["_id"]]);
    });
    it("returns ids double nested in objects", function(){
      var actual = Schema({
        sub2 : {
          type: "object",
          properties: {
            sub3 : {
              type: "objectid",
              required : false
            }
          }
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["sub2", "sub3"], ["_id"]
      ]);
    });

    it("returns objectid paths", function(){
      var actual = schema.getObjectIdPaths();
      assertObjectEquals(actual, [
        ["nested", "sub"],
        ["participants", "*"],
        ["_id"]
      ]);
    });
    it("returns array nested objectid paths", function(){
      var actual = Schema({
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
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["participants", "*", "subarr", '*'], ["_id"]
      ]);
    });
    it("does not infinite loop with unspecified 'itmes' and 'properties' fields", function() {
      var actual = Schema({
        object: {
          type: "object"
        },
        array: {
          type: "array"
        }
      }).getObjectIdPaths();
      assertObjectEquals(actual, [
        ["_id"]
      ]);
    });
  });
  describe("getDatePaths", function(){
    it("can get paths on a single date", function(){
      var actual = Schema({
        date: {
          type : 'date',
          required : false
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ['date']
      ]);
    });
    it("can get paths on objects of dates", function(){
      var actual = Schema({
        dates: {
          type: 'object',
          properties: {
            date1 : {
              type : "date"
            },
            date2 : {
              type : "date"
            }
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["dates", "date1"], ["dates", "date2"]
      ]);
    });
    it("can get paths on arrays of dates", function(){
      var actual = Schema({
        arr: {
          type : 'array',
          items : {
            type : "date"
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["arr", "*"]
      ]);
    });
    it("can get paths on arrays of arrays of dates", function(){
      var actual = Schema({
        arr: {
          type : 'array',
          items : {
            type : 'array',
            items : {
              type : "date"
            }
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["arr", "*", "*"]
      ]);
    });
    it("returns empty when nested arrays have no date", function(){
      var actual = Schema({
        arr: {
          type : 'array',
          items : {
            type : 'array',
            items : {
              type : "number"
            }
          }
        }
      }).getDatePaths();
      assertObjectEquals(actual, [ ]);
    });

    it("returns date paths", function(){
      var actual = schema.getDatePaths();
      assertObjectEquals(actual, [
        ["date"]
      ]);
    });
    it("returns array nested date paths", function(){
      var actual = Schema({
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
      }).getDatePaths();
      assertObjectEquals(actual, [
        ["participants", "*", "subarr", '*']
      ]);
    });
    it("does not infinite loop with unspecified 'itmes' and 'properties' fields", function() {
      var actual = Schema({
        object: {
          type: "object"
        },
        array: {
          type: "array"
        }
      }).getDatePaths();
      assertObjectEquals(actual, []);
    });
  });
  describe("validate", function(){
    it ("rejects bad ids", function(done){
      try {
        schema.validate({
          nested : {
            sub : '52f044dee2896a8264d7ec2', // bad id here
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
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f'],
          date : new Date()
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Property is required');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects bad dates", function(done) {
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
    it ("rejects data with incorrect types", function(done) {
      try {
        schema.validate({
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          count : "hello",
          participants : "lalala",
          date : new Date()
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Instance is not a required type');
        return done();
      }
      throw "shouldn't get here";
    });
    it ("rejects data with extra fields (with default options)", function(done) {
      try {
        schema.validate({
          nested : {
            sub : '52f044dee2896a8264d7ec2f',
          },
          monkeys: 12,
          count : 42,
          redBalloons: 99,
          participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
        });
      } catch (ex){
        ex.errors[0].message.should.equal('Additional properties are not allowed');
        return done();
      }
      throw "shouldn't get here";
    });
    it("accepts data with extra fields (if option is set)", function(done) {
      var nonRequiredSchema = Schema({
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
          required : true
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
      }, {additionalProperties: true});
      nonRequiredSchema.validate({
        nested : {
          sub : '52f044dee2896a8264d7ec2f',
        },
        monkeys: 12,
        count : 42,
        participants : ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
      });
      done();
    });
    it("handles objects whose properties are not listed", function(done) {
      var objectSchema = Schema({
        object1: {
          type: "object"
        },
        object2: {
          type: "object",
          properties: {
            nested1: {
              type: "object"
            },
            nested2: {
              type: "object"
            }
          }
        }
      });
      objectSchema.validate({
        object1: {
          prop1: true,
          prop2: "hello"
        },
        object2: {
          nested1: {
            hello: true,
            goodbye: false
          },
          nested2: {
            innerObject: {
              emptyObject: {}
            }
          }
        }
      });
      done();
    });
    it("handles objects within ararys", function(done) {
      var objectSchema = Schema({
        array: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "objectid"
              }
            }
          }
        }
      });
      objectSchema.validate({
        array: [
          {id: ObjectID('52f044dee2896a8264d7ec2f')},
          {id: ObjectID('52f044dee2896a8264d7ec22')},
          {id: ObjectID('52f044dee2896a8264d7ec21')}
        ]
      });
      done();
    });
    it("handles multiple types", function(done) {
      var schemaWithMultipleTypes = Schema({
        canBe: {
          type: ['array', 'string'],
          items: {
            type: 'string'
          }
        }
      });
      schemaWithMultipleTypes.validate({
        canBe: 'string'
      });
      schemaWithMultipleTypes.validate({
        canBe: ['string1', 'string2']
      });
      try {
        schemaWithMultipleTypes.validate({
          canBe: 3
        });
      } catch (ex1) {
        ex1.errors[0].message.should.equal("Instance is not a required type");
        try {
          schemaWithMultipleTypes.validate({
            canBe: {field: 'string'}
          });
        } catch (ex2) {
          ex2.errors[0].message.should.equal("Instance is not a required type");
          return done();
        }
      }
      throw "should not get here.";
    });

    it("accepts good data against the schema", function(done) {
      try {
          schema.validate({
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
          count: 42,
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
    it ("rejects data with extra fields (with default options)", function(done) {
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
            required : true
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
