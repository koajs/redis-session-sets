'use strict'

const _ = require('lodash')

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
  this.ctx.cookies.set(options.key, unset ? '' : session_id, options)
}

// get the redis key for this session
Session.prototype.getKey = function () {
  return this._store.getSessionKey(this._getSessionId())
}

// get a session.
// if the session does not exist, create a new one and return it
Session.prototype.get = function (fields) {
  const session_id = this._getSessionId()
  return this._store.get(session_id, fields ? _.uniq(fields.concat('id')) : null).then(session => {
    if (session.id) return session
    return this._tokens.secret().then(_csrf_secret => {
      return this.set({
        _csrf_secret
      })
    })
  })
}

Session.prototype.set = function (values, maxAge) {
  this._setCookie()
  const session_id = this._getSessionId()
  return this.store.set(session_id, values, maxAge)
}

Session.prototype.unset = function (fields, maxAge) {
  this._setCookie()
  const session_id = this._getSessionId()
  return this.store.unset(session_id, fields, maxAge)
}

Session.prototype.touch = function (maxAge) {
  this._setCookie()
  const session_id = this._getSessionId()
  return this.store.touch(session_id, maxAge)
}

Session.prototype.delete = function () {
  this._id = null
  this._setCookie('')
  const session_id = this._getSessionId()
  return this.store.delete(session_id)
}

Session.prototype.createCSRFToken = function (session) {
  return Promise.resolve(session || this.get('_csrf_secret')).then(session => {
    return this._tokens.create(session._csrf_secret)
  })
}

Session.prototype.verifyCSRFToken = function (session, token) {
  if (typeof session === 'string') {
    token = session
    session = null
  }
  return Promise.resolve(session || this.get('_csrf_secret')).then(session => {
    return this._tokens.verify(session._csrf_secret, token)
  })
}
