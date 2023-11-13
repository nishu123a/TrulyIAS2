/**
 * helper function that returns jwt from a request
 */
const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    request.token = authorization.substring(7)
    next()
  } else {
    request.tokenField = null
    next()
  }
}

const errorLogger = (error, request, response, next) => {
  console.log(error)
  next(error)
}

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

// eslint-disable-next-line no-unused-vars,consistent-return
const errorHandler = (error, request, response, next) => {
  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return response.status(400).send({ error: 'malformed id' })
  } if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  } if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'invalid token' })
  }
}

module.exports = {
  tokenExtractor,
  errorLogger,
  errorHandler,
  unknownEndpoint,
}
