
const ms = require('ms')

exports.ms = function getMS (x) {
  if (typeof x === 'number') return x
  if (typeof x === 'string') return ms(x) || ms('28 days')
  throw new Error(`Undefined: ${x}`)
}
