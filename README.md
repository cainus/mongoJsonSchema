#mongo-json-schema

This is a library for validating objects against a jsonSchema before inserting into (and after retrieving from) mongo.
### Creating a schema object
```javascript  
var Schema = require('mongo-json-schema');
var schema = Schema({
  nested: {
    type: 'object',
    properties: {
      sub: {
        type: "objectid"
      }
    }
  },
  count: {
    type: "number",
    required: false
  },
  participants: {
    type: "array",
    items: {
      type: "objectid",
    }
  }
});
  
```

### Validating an input object
```javascript
schema.validate({
  _id '52f044dee2896a8264d7ec2f',
  nested: {
      sub: '52f044dee2896a8264d7ec2f'
  }
})
// throws errors if its not valid!
```

### Getting a standard jsonSchema
```javascript
schema.toJsonSchema();
```

returns:
```javascript
{
  {
    type: 'object',
    properties: {
      _id: {
        type: "string",
        pattern: "^[a-fA-F0-9]{24}$",
        required: true
      },
      nested: {
        type: 'object',
        properties: {
          sub: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
          }
        }
      },
      count: {
        type: "number",
        required: false
      },
      participants: {
        type: "array",
        items: {
          type: "string",
          pattern: "^[a-fA-F0-9]{24}$"
        }
      }
    }
  }
}
```
###getting an object with strings for ids
```javascript
  schema.idsToStrings({
    _id: ObjectID('52f044dee2896a8264d7ec2f'),
    nested: {
      sub: ObjectID('52f044dee2896a8264d7ec2f'),
    },
    count: 42,
    participants: [ObjectID('52f044dee2896a8264d7ec2f'),ObjectID('52f044dee2896a8264d7ec2f')]
  });
```
returns:
```javascript
{
  _id: '52f044dee2896a8264d7ec2f',
  nested: {
    sub: '52f044dee2896a8264d7ec2f',
  },
  count: 42,
  participants: ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
}
```

###getting an object with ObjectIDs for ids
```javascript
schema.stringsToIds({
  _id: '52f044dee2896a8264d7ec2f',
  nested: {
    sub: '52f044dee2896a8264d7ec2f',
  },
  count: 42,
  participants: ['52f044dee2896a8264d7ec2f','52f044dee2896a8264d7ec2f']
});
```
returns:
```javascript
{
  _id: ObjectID('52f044dee2896a8264d7ec2f'),
  nested: {
    sub: ObjectID('52f044dee2896a8264d7ec2f'),
  },
  count: 42,
  participants: [ObjectID('52f044dee2896a8264d7ec2f'),ObjectID('52f044dee2896a8264d7ec2f')]
}
```



