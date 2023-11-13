const express = require('express')

const router = express.Router()
const Question = require('../models/question')
const User = require('../models/user')
const userService = require('../utils/user')
const commentsRouter = require('./comments')

router.use('/:questionId/comments/', (request, response, next) => {
  request.questionId = request.params.questionId
  next()
}, commentsRouter)

router.get('/', async (request, response, next) => {
  try {
    const questions = await Question.find({})
      .populate({
        path: 'postedBy',
        model: 'User',
        select: 'username',
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'postedBy',
          model: 'User',
          select: 'username',
        },
      })
    return response.json(questions)
  } catch (error) {
    return next(error)
  }
})

// used to show a question in frontend
router.get('/:id', async (request, response, next) => {
  const { id } = request.params
  try {
    const question = await Question.findById(id)
      .populate({
        path: 'postedBy',
        model: 'User',
        select: 'username',
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'postedBy',
          model: 'User',
          select: 'username',
        },
      })
    if (question) {
      return response.json(question)
    }
    return response.status(404)
      .end()
  } catch (error) {
    return next(error)
  }
})

// create a new question
router.post('/', async (request, response, next) => {
  try {
    const { body } = request
    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.title || !body.content) {
      return response.status(401)
        .json({ error: 'title and content must be provided' })
    }

    const newQuestion = new Question({
      title: body.title,
      content: body.content,
      solved: false,
      likes: [{
        value: 0,
      }],
      postedDate: new Date(),
      tags: body.tags ? body.tags : [],
      postedBy: user.id,
    })

    const question = await newQuestion.save()

    // add the question to the user's questions
    user.questions.push(question._id)
    await User.findByIdAndUpdate(user.id, user)

    return response.status(201)
      .json(question)
  } catch (error) {
    return next(error)
  }
})

router.put('/:id', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params
    const question = await Question.findById(id)

    if (!question) {
      return response.status(401)
        .json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.title || !body.content) {
      return response.status(401)
        .json({ error: 'title and content must be provided' })
    }

    if (question.postedBy.toString() !== user._id.toString()) {
      return response.status(401)
        .json({ error: 'a questions can be deleted by authors only' })
    }

    const newQuestion = {
      title: body.title,
      content: body.content,
      solved: body.solved,
      tags: body.tags,
    }

    await Question.findByIdAndUpdate(question.id, newQuestion)

    return response.status(200)
      .json(question)
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/title-content', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params
    const question = await Question.findById(id)

    if (!question) {
      return response.status(401).json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.title || !body.content) {
      return response.status(401)
        .json({ error: 'title and content must be provided' })
    }

    if (question.postedBy.toString() !== user._id.toString()) {
      return response.status(401).json({ error: 'a questions can be deleted by authors only' })
    }

    const updatedQuestion = {
      ...question._doc,
      title: body.title,
      content: body.content,
    }

    await Question.findByIdAndUpdate(id, updatedQuestion)
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/tags', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params
    const question = await Question.findById(id)

    if (!question) {
      return response.status(401).json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (question.postedBy.toString() !== user._id.toString()) {
      return response.status(401).json({ error: 'a questions can be deleted by authors only' })
    }

    if (!body.tags) {
      return response.status(401)
        .json({ error: 'tags must be provided' })
    }

    const updatedQuestion = {
      ...question._doc,
      tags: body.tags,
    }

    await Question.findByIdAndUpdate(id, updatedQuestion)
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

router.post('/:id/solved', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params
    const question = await Question.findById(id)

    if (!question) {
      return response.status(401).json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (question.postedBy.toString() !== user._id.toString()) {
      return response.status(401).json({ error: 'a questions can be deleted by authors only' })
    }

    if (!body.solved) {
      return response.status(401)
        .json({ error: 'solved must be provided' })
    }

    const updatedQuestion = {
      ...question._doc,
      solved: body.solved,
    }

    await Question.findByIdAndUpdate(id, updatedQuestion)
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

/**
 * increases the number of likes based on the likes object that's posted
 * if likes >= 0 then the likes are increased by 1, else decreased by 1
 * */
router.post('/:id/likes', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params
    const question = await Question.findById(id)

    if (!question) {
      return response.status(401).json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.likes) {
      return response.status(401)
        .json({ error: 'likes must be provided as a number' })
    }

    const likeUsers = question.likes.map((like) => like.likedBy)

    // if the user upvotes or downvotes again
    if (likeUsers.includes(user.id)) {
      const currentLike = body.likes >= 0 ? 1 : -1
      const userLikes = question.likes.filter((like) => String(like.likedBy) === String(user.id))
      const userLike = userLikes[userLikes.length - 1].value
      if (currentLike === userLike || currentLike * 2 === userLike) {
        return response.status(401).end()
      }

      // if the question had 3 likes, and the user upvote,
      // it becomes 4, then he downvotes,
      // it should be (init value - 1) which is (4 - 2)
      const updatedQuestion = {
        ...question._doc,
        likes: question.likes.concat({
          value: body.likes >= 0 ? 2 : -2,
          likedBy: user.id,
        }),
      }
      await Question.findByIdAndUpdate(id, updatedQuestion)
      return response.status(200).end()
    }

    const updatedQuestion = {
      ...question._doc,
      likes: question.likes.concat({
        value: body.likes >= 0 ? 1 : -1,
        likedBy: user.id,
      }),
    }

    await Question.findByIdAndUpdate(id, updatedQuestion)
    return response.status(200).end()
  } catch (error) {
    return next(error)
  }
})

// delete a question
router.delete('/:id', async (request, response, next) => {
  try {
    const { id } = request.params
    const question = await Question.findById(id)

    if (!question) {
      return response.status(401).json({ error: 'invalid question id' })
    }

    const user = await userService.isAuthenticated(request.cookies.token)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (question.postedBy.toString() !== user._id.toString()) {
      return response.status(401).json({ error: 'a questions can be deleted by authors only' })
    }

    const updatedUserQuestion = user._doc.questions
      .filter((userQuestion) => userQuestion.toString() !== question.id.toString())

    const updatedUser = {
      ...user._doc,
      questions: updatedUserQuestion,
    }

    await Promise.all([
      User.findByIdAndUpdate(user.id, updatedUser),
      Question.findByIdAndRemove(id),
    ])

    return response.status(204).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
