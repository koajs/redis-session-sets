'use strict'

const Promise = require('any-promise')
const _ = require('lodash')

const CSRF_KEY = '_csrf_secret'

module.exports = Session

function Session (ctx, store, tokens, options) {
  this._ctx = ctx
  this._store = store
  this._tokens = tokens
  this._options = options
}

// get the session id, creating a new one if none exists
Session.prototype._getSessionId = function () {
  const options = this._options
  return this._id = this._id
    || this._ctx.cookies.get(options.key, options)
    || this._store.createSessionId(options.byteLength)
}

// set the cookie for this session
Session.prototype._setCookie = function (unset) {
  const options = this._options
  const session_id = this._getSessionId()
  this._ctx.cookies.set(options.key, unset ? '' : session_id, options)
}

// get the redis key for this session
Session.prototype.getKey = function () {
  return this._store.getSessionKey(this._getSessionId())
}

// get a session.
// if the session does not exist, create a new one and return it
Session.prototype.get = function (fields) {
  const session_id = this._getSessionId()
  this._ctx.assert(!fields || Array.isArray(fields), '.session.get(fields) must be an array.')
  return this._store.get(session_id, fields ? _.uniq(fields.concat('id')) : null).then(session => {
    if ((!fields || ~fields.indexOf(CSRF_KEY)) && !session[CSRF_KEY]) {
      // create a csrf token and return it
      return this._tokens.secret().then(secret => {
        return this.set({
          [CSRF_KEY]: secret
        }).then(() => {
          session[CSRF_KEY] = secret
          return session
        })
      })
    }

    return session
  })
}

Session.prototype.set = function (values, maxAge) {
  this._setCookie()
  const session_id = this._getSessionId()
  return this._store.set(session_id, values, maxAge)
}

Session.prototype.unset = function (fields, maxAge) {
  this._setCookie()
  const session_id = this._getSessionId()
  return this._store.unset(session_id, fields, maxAge)
}

Session.prototype.touch = function (maxAge) {
  this._setCookie()
  const session_id = this._getSessionId()
  return this._store.touch(session_id, maxAge)
}

Session.prototype.delete = function () {
  this._id = null
  this._setCookie(true)
  const session_id = this._getSessionId()
  return this._store.delete(session_id)
}

Session.prototype.createCSRFToken = function (session) {
  return Promise.resolve(session || this.get([CSRF_KEY])).then(session => {
    this._ctx.assert(session[CSRF_KEY], 'CSRF secret not set in session.')
    return this._tokens.create(session[CSRF_KEY])
  })
}

Session.prototype.verifyCSRFToken = function (session, token) {
  if (typeof session === 'string') {
    token = session
    session = null
  }
  return Promise.resolve(session || this.get([CSRF_KEY])).then(session => {
    this._ctx.assert(session[CSRF_KEY], 'CSRF secret not set in session.')
    return this._tokens.verify(session[CSRF_KEY], token)
  })
}
