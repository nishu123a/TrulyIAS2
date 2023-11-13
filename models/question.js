const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const questionSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
    minlength: 8,
  },
  postedDate: Date,
  solved: Boolean,
  tags: [],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  likes: [{
    value: Number,
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
})

questionSchema.plugin(uniqueValidator)

questionSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

const Question = mongoose.model('Question', questionSchema)

module.exports = Question
