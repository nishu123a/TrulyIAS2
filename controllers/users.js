const bcrypt = require('bcryptjs')

const express = require('express')

const router = express.Router()
const User = require('../models/user')
const validator = require('../utils/validator')
const userService = require('../utils/user')

router.get('/', async (request, response, next) => {
  try {
    const users = await User.find({})
      .populate({
        path: 'questions',
        model: 'Question',
        select: ['title', 'likes'],
      })
    return response.json(users)
  } catch (error) {
    return next(error)
  }
})

// used for a user page
router.get('/:id', async (request, response, next) => {
  try {
    const { id } = request.params
    const user = await User.findById(id).populate({
      path: 'questions',
      model: 'Question',
      select: ['title', 'likes'],
    })
    return response.json(user)
  } catch (error) {
    return next(error)
  }
})

router.post('/', async (request, response, next) => {
  const { body } = request
  const salt = 10

  if (body.password === undefined || body.username === undefined || body.email === undefined) {
    return response.status(400).send({
      error: 'error: Both username and password and email must be given',
    })
  }

  const error = await validator.validate(body.username, body.password, body.email, body.dateOfBirth)

  if (error) {
    return response.status(400).send(error)
  }

  try {
    const passwordHash = await bcrypt.hashSync(body.password, salt)

    const newUser = new User({
      username: body.username,
      passwordHash,
      email: body.email,
      dateOfBirth: body.dateOfBirth,
      registerDate: new Date(),
      fullname: body.fullname,
      location: body.location,
    })

    await newUser.save()
    return response.status(200).json(newUser)
  } catch (error) {
    return next(error)
  }
})

// used to update a user's info
router.put('/:id', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params

    const user = await userService.isAuthorized(request.cookies.token, id, body.password)
    if (user.error) {
      return response.status(401).json(user.error)
    }

    if (!body.email || !body.dateOfBirth || !body.fullname) {
      return response.status(401)
        .json({ error: 'email, dateOfBirth, fullname must be provided' })
    }

    const error = await validator
      .validate(body.username, body.password, body.email, body.dateOfBirth)

    if (error) {
      return response.status(400).send(error)
    }

    const updatedUserObj = {
      ...user._doc,
      email: body.email,
      dateOfBirth: body.dateOfBirth,
      location: body.location,
      fullname: body.fullname,
    }
    const updatedUser = await User.findByIdAndUpdate(id, updatedUserObj)
    return response.status(200).json(updatedUser)
  } catch (error) {
    return next(error)
  }
})

// used to delete a user
router.delete('/:id', async (request, response, next) => {
  try {
    const { body } = request
    const { id } = request.params

    const user = await userService.isAuthorized(request.cookies.token, id, body.password)
    if (user.error) {
      return response.status(401).json(user.error)
    }
    await User.findByIdAndRemove(id)
    return response.status(204).end()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
