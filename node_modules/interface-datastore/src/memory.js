'use strict'

const Key = require('./key')
const Adapter = require('./adapter')

// Errors
const Errors = require('./errors')

class MemoryDatastore extends Adapter {
  constructor () {
    super()

    this.data = {}
  }

  async put (key, val) { // eslint-disable-line require-await
    this.data[key.toString()] = val
  }

  async get (key) {
    const exists = await this.has(key)
    if (!exists) throw Errors.notFoundError()
    return this.data[key.toString()]
  }

  async has (key) { // eslint-disable-line require-await
    return this.data[key.toString()] !== undefined
  }

  async delete (key) { // eslint-disable-line require-await
    delete this.data[key.toString()]
  }

  * _all () {
    yield * Object.entries(this.data)
      .map(([key, value]) => ({ key: new Key(key), value }))
  }
}

module.exports = MemoryDatastore
