'use strict'

const _request = require('supertest')
const assert = require('assert')
const redis = require('ioredis')
const Koa = require('koa')

const Session = require('..')

const client = redis.createClient()
const keys = ['asdf', '1234']

before(() => client.flushall())

describe('context.session', () => {
  describe('should get and set the session', () => {
    const app = Koa()
    app.keys = keys
    app.use(Session(app, {
      maxAge: '1 month',
      prefix: 'asdf',
      references: {
        string: {},
      },
      client,
    }))
    app.use(function * () {
      switch (this.method) {
        case 'POST': {
          yield this.session.set({
            number: 1,
            string: 'string',
          })
          this.status = 204
          break
        }
        case 'GET': {
          const session = yield this.session.get()
          this.assert.equal(session.number, 1)
          this.assert.equal(session.string, 'string')

          const key = this.session.getKey()
          const obj = yield client.hgetall(key)
          this.assert(obj)
          this.assert.equal(obj.number, 1)
          this.assert.equal(obj.string, 'string')

          this.status = 204
          break
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
      .expect(204, done)
    })
  })

  describe('should unset the session', () => {
    const app = Koa()
    app.keys = keys
    app.use(Session(app, {
      client,
    }))
    app.use(function * () {
      switch (this.method) {
        case 'POST': {
          yield this.session.set({
            number: 1,
            string: 'string',
          })
          this.status = 204
          break
        }
        case 'DELETE': {
          yield this.session.unset([
            'number',
            'string',
          ])
          this.status = 204
          break
        }
        case 'GET': {
          const session = yield this.session.get()
          this.assert(!session.number)
          this.assert(!session.string)
          this.status = 204
          break
        }
      }
    })
    const agent = _request.agent(app.listen())

    it('.session.set()', done => {
      agent
      .post('/')
      .expect(204, done)
    })

    it('.session.unset()', done => {
      agent
      .delete('/')
      .expect(204, done)
    })

    it('.session.get()', done => {
      agent
      .get('/')
      .expect(204, done)
    })
  })

  describe('should update the session', () => {
    const app = Koa()
    app.keys = keys
    app.use(Session(app, {
      client,
    }))
    app.use(function * () {
      yield this.session.touch()
      this.status = 204
    })
    const agent = _request.agent(app.listen())

    it('.session.touch()', done => {
      agent
      .get('/')
      .expect('Set-Cookie', /.*/)
      .expect(204, done)
    })
  })

  describe('should delete the session', () => {
    const app = Koa()
    app.keys = keys
    app.use(Session(app, {
      client,
    }))
    app.use(function * () {
      switch (this.method) {
        case 'POST': {
          yield this.session.set({
            number: 1,
            string: 'string',
          })
          this.status = 204
          break
        }
        case 'DELETE': {
          yield this.session.delete()
          this.status = 204
          break
        }
        case 'GET': {
          const session = yield this.session.get()
          this.assert(!session.number)
          this.assert(!session.string)
          this.status = 204
          break
        }
      }
    })
    const agent = _request.agent(app.listen())

    it('.session.set()', done => {
      agent
      .post('/')
      .expect(204, done)
    })

    it('.session.delete()', done => {
      agent
      .delete('/')
      .expect(204, done)
    })

    it('.session.get()', done => {
      agent
      .get('/')
      .expect(204, done)
    })
  })

  describe('should handle CSRF tokens', () => {
    it('w/o getting the current session', done => {
      const app = Koa()
      app.keys = keys
      app.use(Session(app, {
        client,
      }))
      app.use(function * () {
        const token = yield this.session.createCSRFToken()
        this.assert(yield this.session.verifyCSRFToken(token))
        this.status = 204
      })
      const agent = _request.agent(app.listen())

      agent
      .get('/')
      .expect(204, done)
    })

    it('w/o getting the current session', done => {
      const app = Koa()
      app.keys = keys
      app.use(Session(app, {
        client,
      }))
      app.use(function * () {
        const session = yield this.session.get()
        const token = yield this.session.createCSRFToken(session)
        this.assert(yield this.session.verifyCSRFToken(session, token))
        this.status = 204
      })
      const agent = _request.agent(app.listen())

      agent
      .get('/')
      .expect(204, done)
    })
  })
})

describe('session', () => {
  it('.getReferenceKey()', () => {
    const app = Koa()
    app.keys = keys
    const session = Session(app, {
      // same options as first test
      maxAge: '1 month',
      prefix: 'asdf',
      references: {
        string: {},
      },
      client,
    })
    app.use(session)

    const key = session.getReferenceKey('string', 'string')
    return client.smembers(key).then(results => {
      assert(results.length)
    })
  })
})
