# interface-datastore <!-- omit in toc -->

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![Build Status](https://flat.badgen.net/travis/ipfs/interface-datastore)](https://travis-ci.com/ipfs/interface-datastore)
[![Code Coverage](https://codecov.io/gh/ipfs/interface-datastore/branch/master/graph/badge.svg)](https://codecov.io/gh/ipfs/interface-datastore)
[![Dependency Status](https://david-dm.org/ipfs/interface-datastore.svg?style=flat-square)](https://david-dm.org/ipfs/interface-datastore)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
![](https://img.shields.io/badge/npm-%3E%3D3.0.0-orange.svg?style=flat-square)
![](https://img.shields.io/badge/Node.js-%3E%3D8.0.0-orange.svg?style=flat-square)

> Implementation of the [datastore](https://github.com/ipfs/go-datastore) interface in JavaScript

## Lead Maintainer <!-- omit in toc -->

[Alex Potsides](https://github.com/achingbrain)

## Table of Contents <!-- omit in toc -->

- [Implementations](#implementations)
- [Adapter](#adapter)
- [Install](#install)
- [Usage](#usage)
  - [Wrapping Stores](#wrapping-stores)
  - [Test suite](#test-suite)
  - [Keys](#keys)
- [API](#api)
  - [`has(key, [options])` -> `Promise<Boolean>`](#haskey-options---promiseboolean)
    - [Arguments](#arguments)
    - [Example](#example)
  - [`put(key, value, [options])` -> `Promise`](#putkey-value-options---promise)
    - [Arguments](#arguments-1)
    - [Example](#example-1)
  - [`putMany(source, [options])` -> `AsyncIterator<{ key: Key, value: Buffer }>`](#putmanysource-options---asynciterator-key-key-value-buffer-)
    - [Arguments](#arguments-2)
    - [Example](#example-2)
  - [`get(key, [options])` -> `Promise<Buffer>`](#getkey-options---promisebuffer)
    - [Arguments](#arguments-3)
    - [Example](#example-3)
  - [`getMany(source, [options])` -> `AsyncIterator<Buffer>`](#getmanysource-options---asynciteratorbuffer)
    - [Arguments](#arguments-4)
    - [Example](#example-4)
  - [`delete(key, [options])` -> `Promise`](#deletekey-options---promise)
    - [Arguments](#arguments-5)
    - [Example](#example-5)
  - [`deleteMany(source, [options])` -> `AsyncIterator<Key>`](#deletemanysource-options---asynciteratorkey)
    - [Arguments](#arguments-6)
    - [Example](#example-6)
  - [`query(query, [options])` -> `AsyncIterable<Buffer>`](#queryquery-options---asynciterablebuffer)
    - [Arguments](#arguments-7)
    - [Example](#example-7)
  - [`batch()`](#batch)
    - [Example](#example-8)
    - [`put(key, value)`](#putkey-value)
    - [`delete(key)`](#deletekey)
    - [`commit([options])` -> `Promise<void>`](#commitoptions---promisevoid)
    - [Arguments](#arguments-8)
    - [Example](#example-9)
  - [`open()` -> `Promise`](#open---promise)
  - [`close()` -> `Promise`](#close---promise)
- [Contribute](#contribute)
- [License](#license)

## Implementations

- Backed Implementations
  - Memory: [`src/memory`](src/memory.js)
  - level: [`datastore-level`](https://github.com/ipfs/js-datastore-level) (supports any levelup compatible backend)
  - File System: [`datstore-fs`](https://github.com/ipfs/js-datastore-fs)
- Wrapper Implementations
  - Mount: [`datastore-core/src/mount`](https://github.com/ipfs/js-datastore-core/tree/master/src/mount.js)
  - Keytransform: [`datstore-core/src/keytransform`](https://github.com/ipfs/js-datastore-core/tree/master/src/keytransform.js)
  - Sharding: [`datastore-core/src/sharding`](https://github.com/ipfs/js-datastore-core/tree/master/src/sharding.js)
  - Tiered: [`datstore-core/src/tiered`](https://github.com/ipfs/js-datastore-core/blob/master/src/tiered.js)
  - Namespace: [`datastore-core/src/namespace`](https://github.com/ipfs/js-datastore-core/tree/master/src/namespace.js)

If you want the same functionality as [go-ds-flatfs](https://github.com/ipfs/go-ds-flatfs), use sharding with fs.

```js
const FsStore = require('datastore-fs')
const ShardingStore = require('datastore-core').ShardingDatatstore
const NextToLast = require('datastore-core').shard.NextToLast

const fs = new FsStore('path/to/store')

// flatfs now works like go-flatfs
const flatfs = await ShardingStore.createOrOpen(fs, new NextToLast(2))
```

## Adapter

An adapter is made available to make implementing your own datastore easier:

```javascript
const { Adapter } = require('interface-datastore')

class MyDatastore extends Adapter {
  constructor () {
    super()
  }

  async put (key, val) {
    // your implementation here
  }

  async get (key) {
    // your implementation here
  }

  // etc...
}
```

See the [MemoryDatastore](./src/memory.js) for an example of how it is used.

## Install

```sh
$ npm install interface-datastore
```

The type definitions for this package are available on http://definitelytyped.org/. To install just use:

```sh
$ npm install -D @types/interface-datastore
```

## Usage

### Wrapping Stores

```js
const MemoryStore = require('interface-datastore').MemoryDatastore
const MountStore = require('datastore-core').MountDatastore
const Key = require('interface-datastore').Key

const store = new MountStore({ prefix: new Key('/a'), datastore: new MemoryStore() })
```

### Test suite

Available under [`src/tests.js`](src/tests.js)

```js
describe('mystore', () => {
  require('interface-datastore/src/tests')({
    async setup () {
      return instanceOfMyStore
    },
    async teardown () {
      // cleanup resources
    }
  })
})
```

### Aborting requests

Most API methods accept an [AbortSignal][] as part of an options object.  Implementations may listen for an `abort` event emitted by this object, or test the `signal.aborted` property. When received implementations should tear down any long-lived requests or resources created.

### Concurrency

The streaming `(put|get|delete)Many` methods are intended to be used with modules such as [it-parallel-batch](https://www.npmjs.com/package/it-parallel-batch) to allow calling code to control levels of parallelisation.  The batching method ensures results are returned in the correct order, but interface implementations should be thread safe.

```js
const batch = require('it-parallel-batch')
const source = [{
  key: ..,
  value: ..
}]

// put values into the datastore concurrently, max 10 at a time
for await (const { key, data } of batch(store.putMany(source), 10)) {
  console.info(`Put ${key}`)
}
```

### Keys

To allow a better abstraction on how to address values, there is a `Key` class which is used as identifier. It's easy to create a key from a `Buffer` or a `string`.

```js
const a = new Key('a')
const b = new Key(Buffer.from('hello'))
```

The key scheme is inspired by file systems and Google App Engine key model. Keys are meant to be unique across a system. They are typically hierarchical, incorporating more and more specific namespaces. Thus keys can be deemed 'children' or 'ancestors' of other keys:

- `new Key('/Comedy')`
- `new Key('/Comedy/MontyPython')`

Also, every namespace can be parameterized to embed relevant object information. For example, the Key `name` (most specific namespace) could include the object type:

- `new Key('/Comedy/MontyPython/Actor:JohnCleese')`
- `new Key('/Comedy/MontyPython/Sketch:CheeseShop')`
- `new Key('/Comedy/MontyPython/Sketch:CheeseShop/Character:Mousebender')`

## API

Implementations of this interface should make the following methods available:

### `has(key, [options])` -> `Promise<Boolean>`

Check for the existence of a given key

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | [Key][] | The key to check the existance of |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
const exists = await store.has(new Key('awesome'))

if (exists) {
  console.log('it is there')
} else {
  console.log('it is not there')
}
```

### `put(key, value, [options])` -> `Promise`

Store a value with the given key.

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | [Key][] | The key to store the value under |
| value | [Buffer][] | Value to store |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
await store.put([{ key: new Key('awesome'), value: Buffer.from('datastores') }])
console.log('put content')
```

### `putMany(source, [options])` -> `AsyncIterator<{ key: Key, value: Buffer }>`

Store many key-value pairs.

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| source | [AsyncIterator][]<{ key: [Key][], value: [Buffer][] }> | The key to store the value under |
| value | [Buffer][] | Value to store |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
const source = [{ key: new Key('awesome'), value: Buffer.from('datastores') }]

for await (const { key, value } of store.putMany(source)) {
  console.info(`put content for key ${key}`)
}
```

### `get(key, [options])` -> `Promise<Buffer>`

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | [Key][] | The key retrieve the value for |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

Retrieve the value stored under the given key.

```js
const value = await store.get(new Key('awesome'))
console.log('got content: %s', value.toString('utf8'))
// => got content: datastore
```

### `getMany(source, [options])` -> `AsyncIterator<Buffer>`

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| source | [AsyncIterator][]<[Key][]> | One or more keys to retrieve values for |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

Retrieve a stream of values stored under the given keys.

```js
for await (const value of store.getMany([new Key('awesome')])) {
  console.log('got content: %s', value.toString('utf8'))
  // => got content: datastore
}
```

### `delete(key, [options])` -> `Promise`

Delete the content stored under the given key.

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | [Key][] | The key to remove the value for |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
await store.delete(new Key('awesome'))
console.log('deleted awesome content :(')
```

### `deleteMany(source, [options])` -> `AsyncIterator<Key>`

Delete the content stored under the given keys.

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| source | [AsyncIterator][]<[Key][]> | One or more keys to remove values for |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
const source = [new Key('awesome')]

for await (const key of store.deleteMany(source)) {
  console.log(`deleted content with key ${key}`)
}
```

### `query(query, [options])` -> `AsyncIterable<Buffer>`

Search the store for some values. Returns an [AsyncIterable][] with each item being a [Buffer][].

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| query | [Object][] | A query object, all properties are optional |
| query.prefix | [String][] | Only return values where the key starts with this prefix |
| query.filters | [Array][]<[Function][]([Buffer][]) -> [Boolean][]> | Filter the results according to the these functions |
| query.orders | [Array][]<[Function][]([Array][]<[Buffer][]>) -> [Array][]<[Buffer][]>> | Order the results according to these functions |
| query.limit | [Number][] | Only return this many records |
| query.offset | [Number][] | Skip this many records at the beginning |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
// retrieve __all__ values from the store
let list = []
for await (const value of store.query({})) {
  list.push(value)
}
console.log('ALL THE VALUES', list)
```

### `batch()`

This will return an object with which you can chain multiple operations together, with them only being executed on calling `commit`.

#### Example

```js
const b = store.batch()

for (let i = 0; i < 100; i++) {
  b.put(new Key(`hello${i}`), Buffer.from(`hello world ${i}`))
}

await b.commit()
console.log('put 100 values')
```

#### `put(key, value)`

Queue a put operation to the store.

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | [Key][] | The key to store the value under |
| value | [Buffer][] | Value to store |

#### `delete(key)`

Queue a delete operation to the store.

| Name | Type | Description |
| ---- | ---- | ----------- |
| key | [Key][] | The key to remove the value for |

#### `commit([options])` -> `Promise<void>`

Write all queued operations to the underyling store. The batch object should not be used after calling this.

#### Arguments

| Name | Type | Description |
| ---- | ---- | ----------- |
| options | [Object][] | An options object, all properties are optional |
| options.signal | [AbortSignal][] | A way to signal that the caller is no longer interested in the outcome of this operation |

#### Example

```js
const batch = store.batch()

batch.put(new Key('to-put'), Buffer.from('hello world'))
batch.del(new Key('to-remove'))

await batch.commit()
```

### `open()` -> `Promise`

Opens the datastore, this is only needed if the store was closed before, otherwise this is taken care of by the constructor.

### `close()` -> `Promise`

Close the datastore, this should always be called to ensure resources are cleaned up.

## Contribute

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT 2017 © IPFS


[Key]: #Keys
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[Buffer]: https://nodejs.org/api/buffer.html
[AbortSignal]: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
[AsyncIterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator
[AsyncIterable]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
[String]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
[Function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[Number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
[Boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean