const supertest = require('supertest')
const mongoose = require('mongoose')
const app = require('../app')
const Question = require('../models/question')
const User = require('../models/user')
const Comment = require('../models/comment')
const testHelper = require('../utils/testHelper')

const agent = supertest.agent(app)

/**
 *
 * logs in a user, and updates the cookie of agent to the user's cookie
 *
 * @param userIndex: the index of user in initialUsers
 * @returns the response of user login
 * */
const createSession = async (userIndex = 0, createUser = true) => {
  const initialUsers = testHelper.getInitialUsers()
  const user = initialUsers[userIndex]

  if (createUser) {
    // register the user
    await agent.post('/api/users')
      .send(initialUsers[userIndex])
  }

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
  await Question.deleteMany({})
  await User.deleteMany({})

  // add initial questions to the db
  const questions = testHelper.getInitialQuestions()
    .map((question) => new Question(question))

  const promiseArray = questions.map((question) => question.save())
  await Promise.all(promiseArray)
})

describe('question crud', () => {
  test('all questions are returned', async () => {
    const initialQuestions = await testHelper.getQuestionsInDb()

    const response = await agent.get('/api/questions')
      .expect(200)

    const finalQuestions = JSON.parse(response.text)

    expect(finalQuestions.sort()).toEqual(initialQuestions.sort())
  })

  test('a proper question can be created', async () => {
    const initialQuestions = await testHelper.getQuestionsInDb()

    const response = await createSession()
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const questionResponse = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    const userGetResponse = await agent.get(`/api/users/${response.body.id}`)
    const finalQuestions = await testHelper.getQuestionsInDb()

    const userQuestions = userGetResponse.body.questions

    expect(finalQuestions.length).toBe(initialQuestions.length + 1)
    expect(userQuestions.map((question) => question.id)).toContain(questionResponse.body.id)
  })

  test('a specific question is returned', async () => {
    const question = (await testHelper.getQuestionsInDb())[0]
    const response = await agent.get(`/api/questions/${question.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const returnedQuestion = JSON.parse(response.text)

    expect(returnedQuestion).toEqual(question)
  })
})

describe('question deletion', () => {
  test('a question can be deleted by the user that created it', async () => {
    const initialQuestions = await testHelper.getQuestionsInDb()
    const response = await createSession()

    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await agent.delete(`/api/questions/${question.body.id}`)
      .send()
      .expect(204)

    // expect the question to be deleted from the user question list
    const userResponse = await agent.get(`/api/users/${response.body.id}`)
    const finalQuestions = await testHelper.getQuestionsInDb()

    expect(finalQuestions.length).toBe(initialQuestions.length)
    expect(userResponse.body.questions).not.toContainEqual(question.body.id)
  })

  test("a question cannot be deleted with a user that didn't create it", async () => {
    const initialQuestions = await testHelper.getQuestionsInDb()

    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    // login the user to get jwt
    await createSession(0)

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    // create another user with a different cookie
    await createSession(1)

    // this delete will use the 2nd user cookie
    const deleteResponse = await agent.delete(`/api/questions/${question.body.id}`)
      .send()
      .expect(401)

    const finalQuestions = await testHelper.getQuestionsInDb()

    expect(finalQuestions.length).toBe(initialQuestions.length + 1)
    expect(deleteResponse.body.error).toBe('a questions can be deleted by authors only')
  })
})

describe('question updation', () => {
  test('a question can be updated', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    // edit title and content
    const editedQuestion = {
      title: 'this question has been edited',
      content: 'this question has been edited',
      tags: ['newTags'],
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await agent.put(`/api/questions/${question.body.id}`)
      .send(editedQuestion)
      .expect(200)

    await createSession(1)

    await agent.put(`/api/questions/${question.body.id}`)
      .send(editedQuestion)
      .expect(401)

    const finalQuestions = await testHelper.getQuestionsInDb()
    const finalQuestion = finalQuestions
      .filter((finalQuestion) => finalQuestion.id === question.body.id)[0]

    expect(finalQuestion.title)
      .toBe(editedQuestion.title)
  })

  /**
   * partial update
   * */
  test('a question\'s with title and content can be updated by the author', async () => {
    const initialQuestions = await testHelper.getQuestionsInDb()
    await createSession()

    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    // edit title and content
    const editedQuestion = {
      title: 'this question has been edited',
      content: 'this question has been edited',
    }

    await agent.post(`/api/questions/${question.body.id}/title-content`)
      .send(editedQuestion)
      .expect(200)

    const finalQuestions = (await testHelper.getQuestionsInDb()).map((question) => ({
      title: question.title,
      content: question.content,
    }))

    expect(finalQuestions.length).toBe(initialQuestions.length + 1)
    expect(finalQuestions).toContainEqual(editedQuestion)
  })

  /**
   * partial update that should fail
   * */
  test('a question with title and content cannot be updated by the user that didnt create it', async () => {
    const initialQuestions = await testHelper.getQuestionsInDb()

    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const editedQuestion = {
      title: 'this question has been edited',
      content: 'this question has been edited',
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await createSession(1)

    await agent.post(`/api/questions/${question.body.id}/title-content`)
      .send(editedQuestion)
      .expect(401)

    const finalQuestions = await testHelper.getQuestionsInDb()
    expect(finalQuestions.length).toBe(initialQuestions.length + 1)
  })

  test('question likes can be increased, decreased by multiple users', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await agent.post(`/api/questions/${question.body.id}/likes`)
      .send({ likes: 1 })
      .expect(200)

    await agent.post(`/api/questions/${question.body.id}/likes`)
      .send({ likes: 1 })
      .expect(401)

    const initLikes = 0

    const questionIncreased = (await testHelper.getQuestionsInDb())
      .filter((incQuestion) => incQuestion.id === question.body.id)[0]

    const increasedLikes = questionIncreased.likes.map((like) => like.value)
      .reduce((a, b) => a + b, 0)

    expect(increasedLikes).toBe(initLikes + 1)

    await createSession(1)

    await agent.post(`/api/questions/${question.body.id}/likes`)
      .send({ likes: -1 })
      .expect(200)

    await agent.post(`/api/questions/${question.body.id}/likes`)
      .send({ likes: -1 })
      .expect(401)

    const questionDecreased = (await testHelper.getQuestionsInDb())
      .filter((decQuestion) => decQuestion.id === question.body.id)[0]

    const decreasedLikes = questionDecreased.likes.map((like) => like.value)
      .reduce((a, b) => a + b, 0)

    expect(decreasedLikes).toBe(increasedLikes - 1)
  })

  test('question tags can be updated by the author', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const tags = {
      tags: ['new_tag', 'react', 'redux'],
    }

    await createSession()
    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await agent.post(`/api/questions/${question.body.id}/tags`)
      .send(tags)
      .expect(200)

    await createSession(1)

    await agent.post(`/api/questions/${question.body.id}/tags`)
      .send(tags)
      .expect(401)

    const authorQuestion = await agent.get(`/api/questions/${question.body.id}`)
    expect(authorQuestion.body.tags.sort()).toEqual(tags.tags.sort())
  })

  test('question can be set to solved by the author', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const solved = {
      solved: true,
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await agent.post(`/api/questions/${question.body.id}/solved`)
      .send(solved)
      .expect(200)

    await createSession(1)

    await agent.post(`/api/questions/${question.body.id}/solved`)
      .send(solved)
      .expect(401)

    const authorQuestion = await agent.get(`/api/questions/${question.body.id}`)
    expect(authorQuestion.body.solved).toBeTruthy()
  })

  test('a comment can be added by any user', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const newComment = {
      content: 'first comment added for the sake of testing',
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    const commentResponse = await agent.post(`/api/questions/${question.body.id}/comments`)
      .send(newComment)
      .expect(200)

    await createSession(1)

    const finalQuestion = (await testHelper.getQuestionsInDb())
      .filter((finalQuestion) => finalQuestion.id === question.body.id)[0]

    const comment = await Comment.findById(commentResponse.body.id)

    expect(finalQuestion.comments.length).toBe(1)
    expect(comment).toBeTruthy()
  })

  test('a comment can be deleted the author', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const comment = {
      content: 'another comment, thanks',
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    await agent.post(`/api/questions/${question.body.id}/comments`)
      .send({
        content: 'new comment, thanks',
      })
      .expect(200)

    const commentResponse = await agent.post(`/api/questions/${question.body.id}/comments`)
      .send(comment)
      .expect(200)

    await createSession(1)

    await agent.delete(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}`)
      .expect(401)

    // login as user 0
    await createSession(0, false)

    await agent.delete(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}`)
      .expect(200)

    const authorQuestion = await agent.get(`/api/questions/${question.body.id}`)
    expect(authorQuestion.body.comments.length).toBe(1)
  })

  test('comment likes can be increased, decreased by multiple users', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const comment = {
      content: 'new comment',
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    const commentResponse = await agent.post(`/api/questions/${question.body.id}/comments`)
      .send(comment)
      .expect(200)

    await agent.post(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}/likes`)
      .send({ likes: 1 })
      .expect(200)

    await agent.post(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}/likes`)
      .send({ likes: 1 })
      .expect(401)

    await agent.post(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}/likes`)
      .send({ likes: -1 })
      .expect(200)

    await createSession(1)

    await agent.post(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}/likes`)
      .send({ likes: 1 })
      .expect(200)

    const finalComment = await Comment.findById(commentResponse.body.id)
    const finalCommentLikes = finalComment.likes.map((like) => like.value)
      .reduce((a, b) => a + b, 0)

    expect(finalCommentLikes).toBe(0)
  })

  test('a comment can be edited by the author', async () => {
    const newQuestion = {
      title: 'first question',
      content: 'first question added for the sake of testing',
      tags: ['testing', 'hello_world'],
    }

    const comment = {
      content: 'new comment',
    }

    await createSession()

    const question = await agent.post('/api/questions')
      .send(newQuestion)
      .expect(201)

    const commentResponse = await agent.post(`/api/questions/${question.body.id}/comments`)
      .send(comment)
      .expect(200)

    await agent.put(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}`)
      .send({ content: 'comment is edited' })
      .expect(200)

    await createSession(1)

    await agent.put(`/api/questions/${question.body.id}/comments/${commentResponse.body.id}`)
      .send({ content: 'comment is edited' })
      .expect(401)

    const finalComment = await Comment.findById(commentResponse.body.id)

    expect(finalComment.content).toBe('comment is edited')
  })
})

afterAll(() => {
  mongoose.connection.close()
})
