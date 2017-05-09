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
    const app = new Koa()
    app.keys = keys
    app.use(Session(app, {
      maxAge: '1 month',
      prefix: 'asdf',
      references: {
        string: {}
      },
      client
    }))
    app.use(async (ctx) => {
      switch (ctx.method) {
        case 'POST': {
          await ctx.session.set({
            number: 1,
            string: 'string'
          })
          ctx.status = 204
          break
        }
        case 'GET': {
          const session = await ctx.session.get()
          ctx.assert.equal(session.number, 1)
          ctx.assert.equal(session.string, 'string')

          const key = ctx.session.getKey()
          const obj = await client.hgetall(key)
          ctx.assert(obj)
          ctx.assert.equal(obj.number, 1)
          ctx.assert.equal(obj.string, 'string')

          ctx.status = 204
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
    const app = new Koa()
    app.keys = keys
    app.use(Session(app, {
      client
    }))
    app.use(async (ctx) => {
      switch (ctx.method) {
        case 'POST': {
          await ctx.session.set({
            number: 1,
            string: 'string'
          })
          ctx.status = 204
          break
        }
        case 'DELETE': {
          await ctx.session.unset([
            'number',
            'string'
          ])
          ctx.status = 204
          break
        }
        case 'GET': {
          const session = await ctx.session.get()
          ctx.assert(!session.number)
          ctx.assert(!session.string)
          ctx.status = 204
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
    const app = new Koa()
    app.keys = keys
    app.use(Session(app, {
      client
    }))
    app.use(async (ctx) => {
      await ctx.session.touch()
      ctx.status = 204
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
    const app = new Koa()
    app.keys = keys
    app.use(Session(app, {
      client
    }))
    app.use(async (ctx) => {
      switch (ctx.method) {
        case 'POST': {
          await ctx.session.set({
            number: 1,
            string: 'string'
          })
          ctx.status = 204
          break
        }
        case 'DELETE': {
          await ctx.session.delete()
          ctx.status = 204
          break
        }
        case 'GET': {
          const session = await ctx.session.get()
          ctx.assert(!session.number)
          ctx.assert(!session.string)
          ctx.status = 204
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
      const app = new Koa()
      app.keys = keys
      app.use(Session(app, {
        client
      }))
      app.use(async (ctx) => {
        const token = await ctx.session.createCSRFToken()
        ctx.assert(await ctx.session.verifyCSRFToken(token))
        ctx.status = 204
      })
      const agent = _request.agent(app.listen())

      agent
      .get('/')
      .expect(204, done)
    })

    it('w/o getting the current session', done => {
      const app = new Koa()
      app.keys = keys
      app.use(Session(app, {
        client
      }))
      app.use(async (ctx) => {
        const session = await ctx.session.get()
        const token = await ctx.session.createCSRFToken(session)
        ctx.assert(await ctx.session.verifyCSRFToken(session, token))
        ctx.status = 204
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
    const app = new Koa()
    app.keys = keys
    const session = Session(app, {
      // same options as first test
      maxAge: '1 month',
      prefix: 'asdf',
      references: {
        string: {}
      },
      client
    })
    app.use(session)

    const key = session.getReferenceKey('string', 'string')
    return client.smembers(key).then(results => {
      assert(results.length)
    })
  })
})
