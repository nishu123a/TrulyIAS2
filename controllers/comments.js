const express = require('express')

const router = express.Router()
const Question = require('../models/question')
const Comment = require('../models/comment')
const userService = require('../utils/user')

router.post('/', async (request, response, next) => {
  try {
    const { body, questionId } = request
    const question = await Question.findById(questionId)

    if (!question) {
      return response.status(401).json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.content) {
      return response.status(401)
        .json({ error: 'content must be provided' })
    }

    const comment = new Comment({
      content: body.content,
      likes: [{
        value: 0,
      }],
      postedBy: user.id,
    })

    await comment.save()

    const updatedQuestion = {
      ...question._doc,
      comments: question._doc.comments.concat(comment),
    }

    await Question.findByIdAndUpdate(questionId, updatedQuestion)
    return response.status(200).json(comment)
  } catch (error) {
    return next(error)
  }
})

router.post('/:commentId/likes', async (request, response, next) => {
  try {
    const { body, questionId } = request
    const { commentId } = request.params
    const comment = await Comment.findById(commentId)
    const question = await Question.findById(questionId)

    if (!comment || !question) {
      return response.status(401).json({ error: 'invalid comment id or question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.likes) {
      return response.status(401)
        .json({ error: 'value must be provided as a number' })
    }

    const likeUsers = comment.likes.map((like) => like.likedBy)

    // if the user upvotes or downvotes again
    if (likeUsers.includes(user.id)) {
      const currentLike = body.likes >= 0 ? 1 : -1
      const userLikes = comment.likes.filter((like) => String(like.likedBy) === String(user.id))
      const userLike = userLikes[userLikes.length - 1].value
      if (currentLike === userLike || currentLike * 2 === userLike) {
        return response.status(401).end()
      }

      const updatedComment = {
        ...comment._doc,
        likes: comment.likes.concat({
          value: body.likes >= 0 ? 2 : -2,
          likedBy: user.id,
        }),
      }

      await Comment.findByIdAndUpdate(comment.id, updatedComment)
      return response.status(200).end()
    }

    const updatedComment = {
      ...comment._doc,
      likes: comment.likes.concat({
        value: body.likes >= 0 ? 1 : -1,
        likedBy: user.id,
      }),
    }

    await Comment.findByIdAndUpdate(comment.id, updatedComment)
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

router.put('/:commentId', async (request, response, next) => {
  try {
    const { body, questionId } = request
    const { commentId } = request.params
    const comment = await Comment.findById(commentId)
    const question = await Question.findById(questionId)

    if (!comment || !question) {
      return response.status(401).json({ error: 'invalid comment id or question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (comment.postedBy.toString() !== user._id.toString()) {
      return response.status(401).json({ error: 'comments can be deleted by authors only' })
    }

    if (!body.content) {
      return response.status(401)
        .json({ error: 'content must be provided' })
    }

    const updatedComment = {
      ...comment._doc,
      content: body.content,
    }

    await Comment.findByIdAndUpdate(commentId, updatedComment)
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

router.delete('/:commentId', async (request, response, next) => {
  try {
    const { questionId } = request
    const { commentId } = request.params
    const comment = await Comment.findById(commentId)
    const question = await Question.findById(questionId)

    if (!comment || !question) {
      return response.status(401).json({ error: 'invalid comment id or question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (comment.postedBy.toString() !== user._id.toString()) {
      return response.status(401).json({ error: 'comments can be deleted by authors only' })
    }

    const updatedQuestion = {
      ...question._doc,
      comments: question._doc.comments.filter((commentID) => commentID !== commentId),
    }

    await Promise.all([
      Question.findByIdAndUpdate(questionId, updatedQuestion),
      Comment.findByIdAndRemove(commentId),
    ])
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
