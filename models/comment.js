const mongoose = require('mongoose')

const commentSchema = mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
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

commentSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  },
})

const Comment = mongoose.model('Comment', commentSchema)

module.exports = Comment
