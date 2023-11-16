require('dotenv').config()
const express = require('express')
const path = require('path')
const fs = require('fs')
const logger = require('morgan')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const middleware = require('./utils/middleware')

const usersRouter = require('./controllers/users')
const questionRouter = require('./controllers/questions')
const loginRouter = require('./controllers/login')

const app = express()
app.use(logger('dev'))
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(logger('combined', { stream: accessLogStream }))

const { DB, FRONTEND } = process.env

if (!DB) {
  console.log('no database uri was found in .env, please provide one')
  console.log('quitting')
  process.exit(0)
}

let TIMEOUT_SECONDS = 1000

if (process.env.NODE_ENV === 'PROD') {
  TIMEOUT_SECONDS = 10000
  console.log("NOTE THAT IF THE SERVER CAN'T ESTABLISH A CONNECTION TO THE DATABASE")
  console.log(`IT WILL KEEP TRYING TO ESTABLISH ONE FOR ${TIMEOUT_SECONDS} MS`)
  console.log(`AND YOU WON'T GET ANY ERRORS UNTIL ${TIMEOUT_SECONDS} MS PASS`)
  console.log('read more about that here https://mongoosejs.com/docs/connections.html')
}

const mongooseOptions = {
 
  serverSelectionTimeoutMS: TIMEOUT_SECONDS,
}

mongoose.connect(DB, mongooseOptions)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('connected to db')
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log(`Error on start: ${err.stack}`)
    process.exit(1)
  })

app.use(cookieParser())
app.use(cors({
  origin: FRONTEND,
  credentials: true,
}))
app.use(express.json())
app.use(middleware.tokenExtractor)
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, '../frontend/build')))

const ROOT_URL = process.env.ROOT_URL === '/' ? '' : process.env.REACT_APP_URL

app.use(`${ROOT_URL}/api/users`, usersRouter)
app.use(`${ROOT_URL}/api/questions`, questionRouter)
app.use(`${ROOT_URL}/api/login`, loginRouter)

if (process.env.NODE_ENV === 'PROD') {
  app.get('*', (request, response) => {
    response.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'))
  })
}

app.use(middleware.errorLogger)
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)
module.exports = app