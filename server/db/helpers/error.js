// TEST CHANGE

// Used in order to prevent returning sensitive information in error callback
function MongoErrorFilteredDoc (err) {
  this.name = 'MongoError'
  this.code = 11000
  this.message = err ? err.message : 'E11000 generic Mongoose error: undefined index: undefined_1 undefined key: { : "" }'
  this.stack = err ? err.stack : (new Error()).stack
}

MongoErrorFilteredDoc.prototype = Object.create(Error.prototype)
MongoErrorFilteredDoc.prototype.constructor = MongoErrorFilteredDoc

module.exports = {
  MongoErrorFilteredDoc: MongoErrorFilteredDoc
}
