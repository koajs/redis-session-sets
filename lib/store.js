'use strict'

const debug = require('debug')('redis-session-sets:store')
const crypto = require('crypto')
const ms = require('ms')

module.exports = Store

function Store (options) {
  // ioredis client
  this.client = options.client
  // session maxAge in redis
  this.maxAge = getMaxAge(options.maxAge) || ms('28 days')

  // name space for all keys
  this.prefix = ''
  if (options.prefix) this.prefix = options.prefix
  else if (options.namespace) this.prefix = `koa-redis-session-sets:${options.namespace}`

  // keys to cross reference
  // in the future, this will allow objects
  this.references = new Map()

  const references = options.references
  if (references) {
    for (const key of Object.keys(references)) {
      this.references.set(key, references[key] || {})
    }
  }

  this.byteLength = options.byteLength || 18
}

// utility to create a session id
Store.prototype.createSessionId = function () {
  return crypto.randomBytes(this.byteLength).toString('base64')
}

// get the redis key for a session hash
Store.prototype.getSessionKey = function (session_id) {
  return `${this.prefix}:${session_id}`
}

// get the redis key for a key/value reference
Store.prototype.getReferenceKey = function (field, value) {
  return `${this.prefix}:${field}:${value}`
}

// get the session based on a session id
// no session.id === new session
Store.prototype.get = function (session_id, fields) {
  const key = this.getSessionKey(session_id)
  if (!Array.isArray(fields)) return this.client.hgetall(key)
  return this.client.hmget(key, fields).then(values => {
    const out = {}
    for (let i = 0; i < fields.length; i++) {
      out[fields[i]] = values[i]
    }
    return out
  })
}

// set a session with values. automatically creates one.
Store.prototype.set = function (session_id, values, maxAge) {
  const key = this.getSessionKey(session_id)
  const references = this.references

  const HMSET = ['hmset', key, 'id', session_id]
  const multi = [
    HMSET,
    ['pexpire', key, getMaxAge(maxAge || this.maxAge)],
  ]
  for (const field of Object.keys(values)) {
    const value = values[field]
    HMSET.push(field, value)
    if (references.has(field)) {
      // associate this field's value with this session
      multi.push(
        [
          'sadd',
          this.getReferenceKey(field, value),
          session_id
        ]
      )
    }
  }

  debug('set: %o', multi)

  return this.client.multi(multi).exec()
}

// instead of setting to `null`, unset will remove references as well
Store.prototype.unset = function (session_id, fields, maxAge) {
  const key = this.getSessionKey(session_id)
  const references = this.references

  const HDEL = ['hdel', key]
  const multi = [
    HDEL,
    ['pexpire', key, getMaxAge(maxAge || this.maxAge)],
  ]

  for (const field of fields) {
    HDEL.push(field)
  }

  if (!fields.some(field => references.has(field))) return this.client.multi(multi).exec()

  return this.get(session_id, fields.filter(field => references.has(field))).then(session => {
    for (const field of Object.keys(session)) {
      multi.push([
        'srem',
        this.getReferenceKey(field, session[field]),
        session_id
      ])
    }

    debug('unset: %o', multi)

    return this.client.multi(multi).exec()
  })
}

// update the PEXPIRE time
Store.prototype.touch = function (session_id, maxAge) {
  const key = this.getSessionKey(session_id)
  return this.client.pexpire(key, getMaxAge(maxAge || this.maxAge))
}

// delete the session and its references
Store.prototype.delete = function (session_id) {
  const key = this.getSessionKey(session_id)
  const references = this.references
  const referencedFields = []
  for (const field of references.keys()) {
    referencedFields.push(field)
  }

  const multi = [
    ['del', key]
  ]

  return Promise.resolve(referencedFields.length
    ? this.client.hmget(key, referencedFields)
    : []
  ).then(results => {
    for (let i = 0; i < results.length; i += 2) {
      multi.push([
        'srem',
        this.getReferenceKey(results[i], results[i + 1]),
        session_id
      ])
    }

    return this.client.multi(multi).exec()
  })
}

function getMaxAge (maxAge) {
  if (typeof maxAge === 'number') return maxAge
  if (typeof maxAge === 'string') return ms(maxAge)
}
