'use strict'

const tempdir = require('ipfs-utils/src/temp-dir')

exports.filter = (iterable, filterer) => {
  return (async function * () {
    for await (const value of iterable) {
      const keep = await filterer(value)
      if (!keep) continue
      yield value
    }
  })()
}

// Not just sort, because the sorter is given all the values and should return
// them all sorted
exports.sortAll = (iterable, sorter) => {
  return (async function * () {
    let values = []
    for await (const value of iterable) values.push(value)
    values = await sorter(values)
    for (const value of values) yield value
  })()
}

exports.take = (iterable, n) => {
  return (async function * () {
    if (n <= 0) return
    let i = 0
    for await (const value of iterable) {
      yield value
      i++
      if (i >= n) return
    }
  })()
}

exports.map = (iterable, mapper) => {
  return (async function * () {
    for await (const value of iterable) {
      yield mapper(value)
    }
  })()
}

exports.replaceStartWith = function (s, r) {
  const matcher = new RegExp('^' + r)
  return s.replace(matcher, '')
}

exports.tmpdir = tempdir
