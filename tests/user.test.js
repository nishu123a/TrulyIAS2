const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const User = require('../models/user')
const testHelper = require('../utils/testHelper')

const agent = supertest.agent(app)

/**
 *
 * logs in a user, and updates the cookie of agent to the user's cookie
 *
 * @param userIndex: the index of user in initialUsers
 * @returns the response of user login
 * */
const createSession = async (userIndex = 0) => {
  const initialUsers = testHelper.getInitialUsers()
  const user = initialUsers[userIndex]

  // login
  const response = await agent
    .post('/api/login')
    .send(user)

  const cookie = response
    .headers['set-cookie'][0]
    .split(',')
    .map((item) => item.split(';')[0])
  agent.jar.setCookie(cookie[0])
  return response
}

beforeEach(async () => {
  // clear the database
  await User.deleteMany({})

  // add initial users to the db
  const users = testHelper.getInitialUsers()

  const promiseArray = users.map((user) => agent.post('/api/users').send(user))
  await Promise.all(promiseArray)
})

describe('user crud', () => {
  test('all users are returned', async () => {
    const initialUsers = await testHelper.getUsersInDb()

    const response = await agent.get('/api/users')
      .expect(200)

    const finalUsers = JSON.parse(response.text).map((user) => {
      const userObj = {
        username: user.username,
        email: user.email,
        questions: user.questions,
        id: user.id,
        registerDate: new Date(user.registerDate),
        dateOfBirth: new Date(user.dateOfBirth),
        fullname: user.fullname,
        location: user.location,
      }
      return userObj
    })

    expect(finalUsers.sort()).toEqual(initialUsers.sort())
  })

  test('a proper user can be registered', async () => {
    const initialUsers = await testHelper.getUsersInDb()

    const newUser = {
      username: 'fibi',
      password: 'ayoFibCome6layHere',
      email: 'fibi@fibi.fr',
      dateOfBirth: '06-22-1955',
    }

    await agent.post('/api/users')
      .send(newUser)
      .expect(200)

    const finalUsers = await testHelper.getUsersInDb()

    const usernames = finalUsers.map((user) => user.username)

    expect(finalUsers.length).toBe(initialUsers.length + 1)
    expect(usernames).toContain(newUser.username)
  })

  test('a user can be deleted', async () => {
    const initialUsers = testHelper.getInitialUsers()

    const firstUser = {
      username: initialUsers[0].username,
      password: initialUsers[0].password,
    }

    const secondUser = {
      username: initialUsers[1].username,
      password: initialUsers[1].password,
    }

    const firstUserResponse = await createSession()

    // bad cookie and bad password
    await agent.delete(`/api/users/${firstUserResponse.body.id}`)
      .send(secondUser)
      .expect(401)

    // good cookie and bad password
    await agent.delete(`/api/users/${firstUserResponse.body.id}`)
      .send(secondUser)
      .expect(401)

    const secondUserResponse = await createSession(1)

    // bad cookie and good password
    await agent.delete(`/api/users/${firstUserResponse.body.id}`)
      .send(firstUser)
      .expect(401)

    // good cookie and bad password
    await agent.delete(`/api/users/${secondUserResponse.body.id}`)
      .send(firstUser)
      .expect(401)

    // good cookie and good password
    await agent.delete(`/api/users/${secondUserResponse.body.id}`)
      .send(secondUser)
      .expect(204)

    const finalUsers = await testHelper.getUsersInDb()
    const finalUsernames = finalUsers.map((user) => user.username)

    expect(finalUsers.length).toBe(initialUsers.length - 1)
    expect(finalUsernames).not.toContain(secondUser.username)
  })

  test('a user can be updated', async () => {
    const initialUsers = testHelper.getInitialUsers()

    const updatedUser = {
      ...initialUsers[1],
      email: 'newemailwho@dis.com',
    }

    const firstUser = {
      username: initialUsers[0].username,
      password: initialUsers[0].password,
    }

    const secondUser = {
      username: initialUsers[1].username,
      password: initialUsers[1].password,
    }

    const firstUserResponse = await createSession()

    // good cookie and bad password
    await agent.put(`/api/users/${firstUserResponse.body.id}`)
      .send(secondUser)
      .expect(401)

    const secondUserResponse = await createSession(1)

    // bad cookie and good password
    await agent.put(`/api/users/${firstUserResponse.body.id}`)
      .send(firstUser)
      .expect(401)

    // bad cookie and bad password
    await agent.put(`/api/users/${firstUserResponse.body.id}`)
      .send(secondUser)
      .expect(401)

    // good cookie and good password
    await agent.put(`/api/users/${secondUserResponse.body.id}`)
      .send(updatedUser)
      .expect(200)

    const finalUsers = await testHelper.getUsersInDb()
    const finalUser = finalUsers.filter((user) => user.username === initialUsers[1].username)[0]

    expect(finalUser.email).toEqual(updatedUser.email)
  })

  test('a specific user is returned', async () => {
    const initialUsers = await testHelper.getUsersInDb()
    const response = await agent.get(`/api/users/${initialUsers[0].id}`)
      .expect(200)

    const user = JSON.parse(response.text)
    const finalUser = {
      username: user.username,
      email: user.email,
      questions: user.questions,
      id: user.id,
      registerDate: new Date(user.registerDate),
      dateOfBirth: new Date(user.dateOfBirth),
      fullname: user.fullname,
      location: user.location,
    }

    expect(finalUser).toEqual(initialUsers[0])
  })
})

afterAll(() => {
  mongoose.connection.close()
})
