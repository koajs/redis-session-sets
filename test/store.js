'use strict'

const redis = require('ioredis')
const assert = require('assert')
const _ = require('lodash')

const Store = require('../lib/store')

const client = redis.createClient()

describe('Store', () => {
  const store = createStore({
    references: {
      user_id: true,
      ip: true
    }
  })
  let id

  it('should create a session id', () => {
    id = store.createSessionId()
    assert.equal('string', typeof id)
  })

  it('non-existent sessions should return an empty object', () => {
    return store.get(id).then(obj => {
      assert(_.isEmpty(obj))
    })
  })

  it('should set the session', () => {
    return store.set(id, {
      user_id: 1,
      ip: '0.0.0.0'
    })
  })

  it('should get the session', () => {
    return store.get(id).then(obj => {
      assert.equal(obj.id, id)
      assert.equal(obj.user_id, 1)
      assert.equal(obj.ip, '0.0.0.0')
    })
  })

  it('should get session ids of sessions with this IP', () => {
    const key = store.getReferenceKey('ip', '0.0.0.0')
    return client.smembers(key).then(results => {
      assert(_.includes(results, id))
    })
  })

  it('should unset a field', () => {
    return store.unset(id, ['ip']).then(() => {
      return store.get(id)
    }).then(obj => {
      assert(!obj.ip)
      const key = store.getReferenceKey('ip', '0.0.0.0')
      return client.smembers(key)
    }).then(results => {
      assert(!_.includes(results, id))
    })
  })

  it('should .touch()', () => {
    return store.touch(id)
  })

  it('should .delete() a session', () => {
    return store.delete(id).then(() => {
      return store.get(id)
    }).then(obj => {
      assert(!obj.id)
      const key = store.getReferenceKey('user', 1)
      return client.smembers(key)
    }).then(results => {
      assert(!_.includes(results, id))
    })
  })
})

function createStore (options) {
  return new Store(Object.assign({}, {
    client,
    namespace: Math.random().toString(36).slice(2)
  }, options || {}))
}
