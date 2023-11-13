const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

const TOKEN_ERROR = { error: 'token missing or invalid' }
const PASSWORD_ERROR = { error: 'wrong password' }

const decodeToken = (token) => {
  const decodedToken = jwt.decode(token, process.env.SECRET)
  return decodedToken
}

/**
 * Checks if a user is logged in or not
 *
 * @param token: the token the user used in the request
 * @return user object if the user is authenticated, error object otherwise
 * */
const isAuthenticated = async (token) => {
  const decodedToken = decodeToken(token)

  if (!decodedToken.id) {
    return TOKEN_ERROR
  }

  const { id } = decodedToken
  const user = await User.findById(id)

  if (!user) {
    return TOKEN_ERROR
  }

  return user
}

/**
 * Checks if the user is authorized to do some operations
 * usually these operations are user related, like deleting a user or
 * updating a user
 *
 * A user is authorized if their token is valid, and they have the right
 * to update/delete their account
 *
 * @param token: the token the user used in the request
 * @param userId: the id of the user
 * @param password: the password the user provided as password confirmation
 * @return user object if the user is authorized, error object otherwise
 * */
const isAuthorized = async (token, userId, password) => {
  const decodedToken = decodeToken(token)

  if (userId && (!decodedToken.id || decodedToken.id !== userId)) {
    return TOKEN_ERROR
  }

  const user = await isAuthenticated(token, userId)

  if (user.error) {
    return user
  }

  if (password) {
    const isPasswordCorrect = user === null
      ? false : await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordCorrect) {
      return PASSWORD_ERROR
    }
  }

  return user
}

module.exports = {
  isAuthenticated,
  isAuthorized,
}
