'use strict'

const _request = require('supertest')
// const assert = require('assert')
const redis = require('ioredis')
const Koa = require('koa')

const Session = require('..')

const client = redis.createClient()
const keys = ['asdf', '1234']

describe('Koa Redis Session Sets', () => {
  describe('should get and set the session', () => {
    const app = Koa()
    app.keys = keys
    app.use(Session(app, {
      client,
    }))
    app.use(function * () {
      switch (this.method) {
        case 'GET': {
          const session = this.body = yield this.session.get()
          this.assert.equal(session.number, 1)
          this.assert.equal(session.string, 'string')
          break
        }
        case 'POST': {
          yield this.session.set({
            number: 1,
            string: 'string',
          })
          this.status = 204
        }
      }
    })
    const agent = _request.agent(app.listen())

    it('.session.set()', done => {
      agent
      .post('/')
      .expect(204, done)
    })

    it('.session.get()', done => {
      agent
      .get('/')
      .expect(200, done)
    })
  })
})
