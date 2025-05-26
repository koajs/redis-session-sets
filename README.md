
# redis-session-sets

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/koajs/redis-session-sets/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/koajs/redis-session-sets/actions?query=workflow%3A%22Node.js+CI%22)
[![Test coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

> NOTE: MAINTAINER WANTED
> 
A redis session for Koa that creates sets for specific values.

Use-case: you want to know all the sessions related to a user so that if the user resets his/her password, you destroy all the sessions.
NOTE: for expiring sessions, this is not optimal. However, you may still use this library as a redis hash-based solution without cross references.

Specifics:

- Stores sessions as hash sets
- Stores cross references as sets
- Functional API

## Example

```js
const Koa = require('koa')
const client = require('ioredis').createClient()

const app = new Koa()
const Session = require('koa-redis-session-sets')(app, {
  client,
  references: {
    user_id: {}
  }
})

app.use(Session)

app.use(async (ctx, next) => {
  // get the session
  let session = await ctx.session.get()

  // update the session
  await ctx.session.set({
    user_id: 1
  })

  // get the session object with latest keys
  session = await ctx.session.get()

  ctx.status = 204
})
```

Here's an example of deleting all the sessions associated with `user_id: 1`.
You have to do it yourself because handling it would be too opinionated.
Specifically, if this set is possibly large, you'd want to use `SSCAN`.

```js
const key = Session.getReferenceKey('user_id', 1)

try {
  const session_ids = await client.smembers(key)
  await Promise.all(session_ids.map(session_id => {
      // deletes the session and removes the session from all the referenced sets
      return Session.store.delete(session_id)
  }))
} catch (err) {
  console.error(err.stack)
  process.exit(1)
}
```

## Maintainers

- Lead: @jonathanong [@jongleberry](https://twitter.com/jongleberry)

## API

### const SessionMiddleware = KoaRedisSessionSets(app, options)

Creates a new session middleware instance.

Options:

- `client` - `ioredis` client
- `references` - fields to reference
- `maxAge` - max age of sessions, defaulting to `28 days`
- `prefix` - optional key prefix
- `byteLength` - optional byte length for CSRF tokens

### app.use(SessionMiddleware)

Use the session middleware in your app.
Note that this is a very simple function and middleware is not required.
Look at the source code to understand how simple it is.

### const Session = SessionMiddleware.createSession(context)

Create your own session object from a context.

### const key = SessionMiddleware.getReferenceKey(field, value)

Get the `key` for a redis `set` that contains all the session ids related to a `field:value` pair.
Use `client.smembers(key)` to get all the session ids.

### const key = Session.getKey()

Session is `ctx.session`.
Get the key for the redis `hash` for use with `client.hgetall(key)`.

### Session.get([fields]).then(session => {})

Get the session, optionally with select fields.

### Session.set(values, [maxAge]).then(values => {})

Set specific fields in the session.
Does not return the new session.

### Session.unset(fields, [maxAge]).then(() => {})

Remove specific fields in the session.
Does not return the new session.

### Session.touch([maxAge]).then(() => {})

Update the session, updating the cookies and the session expire time.

### Session.delete().then(() => {})

Deletes the session.
Does not create a new one.
Execute `const session = await ctx.session.get()` to create a new one

### Session.createCSRFToken([session]).then(token => {})

Create a CSRF token.

### Session.verifyCSRFToken([session], token).then(valid => {})

Returns a boolean of whether a CSRF token is valid.

### const Store = SessionMiddleware.store

The `Store` is the underlying redis logic of the session.

### const key = Store.getSessionKey(session_id)

### const key = Store.getReferenceKey(field, value)

### Store.get(session_id, [fields]).then(session => {})

### Store.set(session_id, values, [maxAge]).then(values => {})

### Store.unset(session_id, fields, [maxAge]).then(() => {})

### Store.touch(session_id, [maxAge]).then(() => {})

### Store.delete(session_id).then(() => {})

[npm-image]: https://img.shields.io/npm/v/koa-redis-session-sets.svg?style=flat-square
[npm-url]: https://npmjs.org/package/koa-redis-session-sets
[codecov-image]: https://img.shields.io/codecov/c/github/koajs/redis-session-sets/master.svg?style=flat-square
[codecov-url]: https://codecov.io/github/koajs/redis-session-sets
[license-image]: http://img.shields.io/npm/l/koa-redis-session-sets.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/koa-redis-session-sets.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/koa-redis-session-sets
