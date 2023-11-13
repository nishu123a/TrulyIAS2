const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const userSchema = mongoose.Schema({
  fullname: String,
  username: {
    type: String,
    unique: true,
    required: true,
    minlength: 3,
  },
  passwordHash: String,
  dateOfBirth: Date,
  email: {
    type: String,
    unique: true,
    required: true,
    minlength: 6,
  },
  location: String,
  registerDate: Date,
  lastSignedInDate: Date,
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
  ],
})

userSchema.plugin(uniqueValidator)

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    // the passwordHash should not be revealed
    delete returnedObject.passwordHash
  },
})

const User = mongoose.model('User', userSchema)

module.exports = User
