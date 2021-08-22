'use strict'

const _request = require('supertest')
const assert = require('assert')
const redis = require('ioredis')
const Koa = require('koa')

const Session = require('..')

const client = redis.createClient()
const keys = ['asdf', '1234']
let server
let agent

beforeAll(() => client.flushall())
afterAll(() => client.quit())

describe('context.session', () => {
  describe('should get and set the session', () => {
    beforeAll(() => {
      const app = new Koa()
      app.keys = keys

      app.use(Session(app, {
        maxAge: '28 days',
        signed: false,
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

      server = app.listen()
      agent = _request.agent(server)
    })

    afterAll(() => server.close())

    it('.session.set()', () => {
      return agent
        .post('/')
        .expect(204)
    })

    it('.session.get()', () => {
      return agent
        .get('/')
        .expect(204)
    })
  })

  describe('should unset the session', () => {
    beforeAll(() => {
      const app = new Koa()
      app.keys = keys

      app.use(Session(app, {
        signed: false,
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

      server = app.listen()
      agent = _request.agent(server)
    })

    afterAll(() => server.close())

    it('.session.set()', () => {
      return agent
        .post('/')
        .expect(204)
    })

    it('.session.unset()', () => {
      return agent
        .delete('/')
        .expect(204)
    })

    it('.session.get()', () => {
      return agent
        .get('/')
        .expect(204)
    })
  })

  describe('should update the session', () => {
    beforeAll(() => {
      const app = new Koa()
      app.keys = keys
      app.use(Session(app, {
        signed: false,
        client
      }))
      app.use(async (ctx) => {
        await ctx.session.touch()
        ctx.status = 204
      })
      server = app.listen()
      agent = _request.agent(server)
    })

    afterAll(() => server.close())

    it('.session.touch()', () => {
      return agent
        .get('/')
        .expect('Set-Cookie', /.*/)
        .expect(204)
    })
  })

  describe('should delete the session', () => {
    beforeAll(() => {
      const app = new Koa()
      app.keys = keys
      app.use(Session(app, {
        signed: false,
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

      server = app.listen()
      agent = _request.agent(server)
    })

    afterAll(() => server.close())

    it('.session.set()', () => {
      return agent
        .post('/')
        .expect(204)
    })

    it('.session.delete()', () => {
      return agent
        .delete('/')
        .expect(204)
    })

    it('.session.get()', () => {
      return agent
        .get('/')
        .expect(204)
    })
  })

  describe('should handle CSRF tokens', () => {
    afterEach(() => server.close())

    it('w/o getting the current session', () => {
      const app = new Koa()
      app.keys = keys
      app.use(Session(app, {
        signed: false,
        client
      }))
      app.use(async (ctx) => {
        const token = await ctx.session.createCSRFToken()
        ctx.assert(await ctx.session.verifyCSRFToken(token))
        ctx.status = 204
      })

      server = app.listen()
      agent = _request.agent(server)

      return agent
        .get('/')
        .expect(204)
    })

    it('w/o getting the current session', () => {
      const app = new Koa()
      app.keys = keys
      app.use(Session(app, {
        signed: false,
        client
      }))
      app.use(async (ctx) => {
        const session = await ctx.session.get()
        const token = await ctx.session.createCSRFToken(session)
        ctx.assert(await ctx.session.verifyCSRFToken(session, token))
        ctx.status = 204
      })

      server = app.listen()
      agent = _request.agent(server)

      return agent
        .get('/')
        .expect(204)
    })
  })
})

describe('session', () => {
  it('.getReferenceKey()', () => {
    const app = new Koa()
    app.keys = keys
    const session = Session(app, {
      // same options as first test
      maxAge: '28 days',
      signed: false,
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
