var mongoose = require('mongoose')
var bcrypt = require('bcrypt')

module.exports = function (plasma, dna, helpers) {
  var UserSchema = new mongoose.Schema({
    username: {
      type: String,
      required: [true, "can't be blank"],
      match: [/^[a-zA-Z0-9]+$/, 'is invalid'],
      index: true,
      unique: true
    },
    email: {
      type: String,
      lowercase: true,
      required: [true, "can't be blank"],
      match: [/\S+@\S+\.\S+/, 'is invalid'],
      index: true,
      unique: true
    },
    password: { type: String },
    image: String,
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number }
  }, { timestamps: true })

  var reasons = UserSchema.statics.failedLogin = {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
  }
  var MAX_LOGIN_ATTEMPTS = 5
  var LOCK_ACCOUNT_HOURS = 1
  var SALT_WORK_FACTOR = 10

  UserSchema.methods.comparePassword = function (passToCompare, next) {
    bcrypt.compare(passToCompare, this.password, function (err, matches) {
      if (err) return next(err)
      next(null, matches)
    })
  }

  UserSchema.pre('save', function (next) {
    var user = this

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next()

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
      if (err) return next(err)

      // hash the password using our new salt
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) return next(err)

        // set the hashed password back on our user document
        user.password = hash
        next()
      })
    })
  })

  UserSchema.post('save', function (err, doc, next) {
    if (err.name === 'MongoError' && err.code === 11000) {

      // Prevent to return user password
      next(new helpers.error.MongoErrorFilteredDoc(err))
    }
  })

  UserSchema.methods.incLoginAttempts = function (next) {
    // if we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {

      return this.update({
        $set: { loginAttempts: 1 },
        $unset: { lockUntil: 1 }
      }, next)
    }

    // otherwise we're incrementing
    var updates = { $inc: { loginAttempts: 1 } }

    // lock the account if we've reached max attempts and it's not locked already
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
      var today = new Date()
      today.setHours(today.getHours() + LOCK_ACCOUNT_HOURS)
      updates.$set = { lockUntil: today.getTime() }
    }

    return this.update(updates, next)
  }

  UserSchema.virtual('isLocked').get(function () {
    // check for a future lockUntil timestamp
    return !!(this.lockUntil && this.lockUntil > Date.now())
  })

  UserSchema.statics.getPublicInfo = function (usr) {
    var res = JSON.parse(JSON.stringify(usr))
    delete res.loginAttempts
    delete res.lockUntil
    delete res.password
    return res
  }

  UserSchema.statics.validate = function (email, password, next) {
    this.findOne({ email: email }, function (err, user) {
      if (err) return next(new helpers.error.MongoErrorFilteredDoc(err))

      // make sure the user exists
      if (!user) {
        return next(null, null, reasons.NOT_FOUND)
      }

      if (user.isLocked) {
        return user.incLoginAttempts(function (err) {
          if (err) return next(err)
          return next(null, null, reasons.MAX_ATTEMPTS)
        })
      }

      user.comparePassword(password, function (err, matches) {
        if (err) return next(err)

        // check if the password was a match
        if (matches) {
          // if there's no lock or failed attempts, just return the user
          if (!user.loginAttempts && !user.lockUntil) {
            return next(null, user)
          }
          // reset attempts and lock info
          var updates = {
            $set: { loginAttempts: 0 },
            $unset: { lockUntil: 1 }
          }
          return user.update(updates, function (err) {
            if (err) return next(err)
            return next(null, user)
          })
        }

        // password is incorrect, so increment login attempts before responding
        user.incLoginAttempts(function (err) {
          if (err) return next(err)
          return next(null, null, reasons.PASSWORD_INCORRECT)
        })
      })
    })
  }

  mongoose.model('User', UserSchema)
}