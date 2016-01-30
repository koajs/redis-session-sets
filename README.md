
# redis-session-sets

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

A redis session for Koa that creates sets for specific values.
Use-case: you want to know all the sessions related to a user so that if the user resets his/her password, you destroy all the sessions.

Specifics:

- Stores sessions as hash sets
- Stores cross references as sets

## Example

```js
const app = require('koa')()
const client = require('ioredis').createClient()

const Session = require('koa-redis-session-sets')(app, {
  client,
  references: {
    user_id: 1
  }
})

app.use(Session)

app.use(function * (next) {
  const session = yield this.session.get()

  this.session.set({
    user_id: 1
  })
})
```

Here's an example of deleting all the sessions associated with `user_id: 1`.
You have to do it yourself because handling it would be too opinionated.
Specifically, if this set is possibly large, you'd want to use `SSCAN`.

```js
const key = Session.getReferenceKey('user_id', 1)

client.smembers(key).then(session_ids => {
  return Promise.all(session_ids.map(session_id => {
    // deletes the session and removes the session from all the referenced sets
    return Session.store.delete(session_id)
  }))
}).catch(err => {
  console.error(err.stack)
  process.exit(1)
})
```

## API

### const SessionMiddleware = KoaRedisSessionSets(app, options)

### app.use(SessionMiddleware)

### const Session = SessionMiddleware.createSession(context)

### const key = SessionMiddleware.getReferenceKey(field, value)

### const key = Session.getKey()

### Session.get([fields]).then(session => {})

### Session.set(values, [maxAge]).then(values => {})

### Session.unset(fields, [maxAge]).then(() => {})

### Session.touch([maxAge]).then(() => {})

### Session.delete().then(() => {})

### Session.createCSRFToken([session]).then(token => {})

### Session.verifyCSRFToken([session], token).then(valid => {})

### const key = SessionMiddleware.store.getSessionKey(session_id)

### const key = SessionMiddleware.store.getReferenceKey(field, value)

### SessionMiddleware.store.get(session_id, [fields]).then(session => {})

### SessionMiddleware.store.set(session_id, values, [maxAge]).then(values => {})

### SessionMiddleware.store.unset(session_id, fields, [maxAge]).then(() => {})

### SessionMiddleware.store.touch(session_id, [maxAge]).then(() => {})

### SessionMiddleware.store.delete(session_id).then(() => {})

[npm-image]: https://img.shields.io/npm/v/koa-redis-session-sets.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-redis-session-sets
[travis-image]: https://img.shields.io/travis/koajs/redis-session-sets/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/koajs/redis-session-sets
[codecov-image]: https://img.shields.io/codecov/c/github/koajs/redis-session-sets/master.svg?style=flat-square
[codecov-url]: https://codecov.io/github/koajs/redis-session-sets
[david-image]: http://img.shields.io/david/koajs/redis-session-sets.svg?style=flat-square
[david-url]: https://david-dm.org/koajs/redis-session-sets
[license-image]: http://img.shields.io/npm/l/koa-redis-session-sets.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/koa-redis-session-sets.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/koa-redis-session-sets
