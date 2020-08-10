'use strict'

const { filter, sortAll, take, map } = require('./utils')
const drain = require('it-drain')

class InterfaceDatastoreAdapter {
  async open () { // eslint-disable-line require-await

  }

  async close () { // eslint-disable-line require-await

  }

  /**
   * Store the passed value under the passed key
   *
   * @param {Key} key
   * @param {Buffer} val
   * @param {Object} options
   * @returns {Promise<void>}
   */
  async put (key, val, options = {}) { // eslint-disable-line require-await

  }

  /**
   * Store the given key/value pairs
   *
   * @param {AsyncIterator<{ key: Key, value: Buffer }>} source
   * @param {Object} options
   * @returns {AsyncIterator<{ key: Key, value: Buffer }>}
   */
  async * putMany (source, options = {}) {
    for await (const { key, value } of source) {
      await this.put(key, value, options)
      yield { key, value }
    }
  }

  /**
   * Retrieve the value for the passed key
   *
   * @param {Key} key
   * @param {Object} options
   * @returns {Promise<Buffer>}
   */
  async get (key, options = {}) { // eslint-disable-line require-await

  }

  /**
   * Retrieve values for the passed keys
   *
   * @param {AsyncIterator<Key>} source
   * @param {Object} options
   * @returns {AsyncIterator<Buffer>}
   */
  async * getMany (source, options = {}) {
    for await (const key of source) {
      yield this.get(key, options)
    }
  }

  /**
   * Check for the existence of a value for the passed key
   *
   * @param {Key} key
   * @returns {Promise<bool>}
   */
  async has (key) { // eslint-disable-line require-await

  }

  /**
   * Remove the record for the passed key
   *
   * @param {Key} key
   * @param {Object} options
   * @returns {Promise<void>}
   */
  async delete (key, options = {}) { // eslint-disable-line require-await

  }

  /**
   * Remove values for the passed keys
   *
   * @param {AsyncIterator<Key>} source
   * @param {Object} options
   * @returns {AsyncIterator<Key>}
   */
  async * deleteMany (source, options = {}) {
    for await (const key of source) {
      await this.delete(key, options)
      yield key
    }
  }

  /**
   * Create a new batch object.
   *
   * @returns {Object}
   */
  batch () {
    let puts = []
    let dels = []

    return {
      put (key, value) {
        puts.push({ key, value })
      },
      delete (key) {
        dels.push(key)
      },
      commit: async (options) => {
        await drain(this.putMany(puts, options))
        puts = []
        await drain(this.deleteMany(dels, options))
        dels = []
      }
    }
  }

  /**
   * Yield all datastore values
   *
   * @param {Object} q
   * @param {Object} options
   * @returns {AsyncIterable<{ key: Key, value: Buffer }>}
   */
  async * _all (q, options) { // eslint-disable-line require-await

  }

  /**
   * Query the store.
   *
   * @param {Object} q
   * @param {Object} options
   * @returns {AsyncIterable<Buffer>}
   */
  async * query (q, options) { // eslint-disable-line require-await
    let it = this._all(q, options)

    if (q.prefix != null) {
      it = filter(it, e => e.key.toString().startsWith(q.prefix))
    }

    if (Array.isArray(q.filters)) {
      it = q.filters.reduce((it, f) => filter(it, f), it)
    }

    if (Array.isArray(q.orders)) {
      it = q.orders.reduce((it, f) => sortAll(it, f), it)
    }

    if (q.offset != null) {
      let i = 0
      it = filter(it, () => i++ >= q.offset)
    }

    if (q.limit != null) {
      it = take(it, q.limit)
    }

    if (q.keysOnly === true) {
      it = map(it, e => ({ key: e.key }))
    }

    yield * it
  }
}

module.exports = InterfaceDatastoreAdapter
