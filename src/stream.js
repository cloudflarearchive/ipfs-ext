const dagPB = require("ipld-dag-pb")
const multihash = require("multihashes")
const Unixfs = require("ipfs-unixfs")

const verify = require("./verify.js")

// asynchronous wraps the body of a stream that works asynchronously. It ensures
// that data is pushed downstream in-order and that `stop` events are held until
// all data is processed.
function asynchronous(input, ondata) {
  let handlers = {
    onstart: (evt) => {},
    ondata: (evt) => {},
    onstop: (evt) => {},
    onerror: (evt, msg) => {},
  }
  let off = 0, buff = []
  let stopEvt = null

  input.onstart = (evt) => { handlers.onstart(evt) }
  input.ondata = (evt) => {
    let i = buff.push(null) - 1, off0 = off
    ondata(evt, (data, err) => {
      if (err != null) {
        handlers.onerror(err)
        return
      }

      buff[i - off + off0] = {data: data}
      for (; buff.length > 0 && buff[0] != null; ) {
        handlers.ondata(buff[0].data)
        buff.shift()
        off++
      }
      if (buff.length == 0 && stopEvt != null) {
        handlers.onstop(stopEvt)
      }
    })
  }
  input.onstop = (evt) => {
    if (buff.length == 0) {
      handlers.onstop(evt)
    } else {
      stopEvt = evt
    }
  }
  input.onerror = (evt, msg) => { handlers.onerror(evt, msg) }

  return handlers
}

// isProbablyError returns true if the decodeRLE parser has probably read a
// textual error message from the server, rather than binary authenticated data.
function isProbablyError(flushed, lenPos, len, buffPos, buff) {
  let ok = !flushed && buffPos < 2048
  // Check if the length buffer starts with "ipf" (errors start with "ipfs").
  ok = ok && lenPos == 3 && len[0] == 105 && len[1] == 112 && len[2] == 102
  // Check that any data in the buffer is ASCII text with no HTML.
  for (let i = 0; i < buffPos; i++) {
    let ascii = buff[i] >= 32 && buff[i] <= 126 && buff[i] != 60 && buff[i] != 62
    ok = ok && (buff[i] == 10 || ascii)
  }
  return ok
}

// decodeRLE reads a big-endian uint24, which it interprets as the length of the
// subsequent payload. Data is buffered until an entire payload is read.
function decodeRLE(input) {
  let handlers = {
    onstart: (evt) => {},
    ondata: (evt) => {},
    onstop: (evt) => {},
    onerror: (evt, msg) => {},
  }

  let flushed = false
  let lenPos = 0, len = Buffer.alloc(3)
  let buffPos = -1, buff = Buffer.alloc(0)

  input.onstart = (evt) => { handlers.onstart(evt) }
  input.ondata = (evt) => {
    let currPos = 0, curr = Buffer.from(evt.data)

    for (; currPos < curr.byteLength; ) {
      if (lenPos < 3) {
        // Read the length of the payload.
        len[lenPos] = curr[currPos]
        lenPos++
      } else {
        // We just finished reading the length. Initialize the buffer for the
        // payload.
        if (buffPos == -1) {
          buffPos = 0
          buff = Buffer.alloc((65536*len[0]) + (256*len[1]) + len[2])
        }

        buff[buffPos] = curr[currPos]
        buffPos++

        // If we just read the last byte of the buffer, send the buffer down and
        // start over.
        if (buffPos == buff.byteLength) {
          handlers.ondata({data: buff})
          flushed = true
          lenPos = 0
          buffPos = -1
        }
      }

      currPos++
    }
  }
  input.onstop = (evt) => {
    if (isProbablyError(flushed, lenPos, len, buffPos, buff)) {
      handlers.onerror(
        new Error("server sent a text error message. (Message is displayed on page.)"),
        Buffer.concat([len, buff.slice(0, buffPos)]),
      )
    } else if (lenPos > 0 || buffPos != -1) {
      handlers.onerror(new Error("stream stopped while in the middle of reading a chunk"))
    }
    handlers.onstop(evt)
  }
  input.onerror = (evt, msg) => { handlers.onerror(evt, msg) }

  return handlers
}
exports.decodeRLE = decodeRLE

// verifyPath intercepts the first few packets of the response, called the
// preamble, and uses them to compute the CID of the response body. The user
// might request for example, /ipns/example.com/index.html, and we would look
// for:
//   1. A DNSSEC proof binding example.com to the hash of a folder.
//   2. The raw directory listing, mapping index.html to the hash of a file.
//
// This function primarily: 1.) Holds the `start` event until we have this CID.
// 2.) Ensures `data` events are processed in serial order, even though the
// processing function is asynchronous.
function verifyPath(url) {
  let path = new verify.Path(url)

  return function(input) {
    let handlers = {
      onstart: (evt) => {},
      ondata: (evt) => {},
      onstop: (evt) => {},
      onerror: (evt, msg) => {},
    }

    let started = false
    let step = async (data) => {
      if (path.done) {
        if (!started) {
          handlers.onstart({
            multihash: path.multihash,
            website: path.website,
            page: path.page,
          })
          started = true
        }
        handlers.ondata({data: data})
      } else {
        return path.step(data).catch((err) => { handlers.onerror(err) })
      }
    }

    let queue = []
    let stopEvt = null

    input.ondata = (evt) => {
      queue.push(evt.data)
      if (queue.length > 1) {
        return
      }

      let f = () => {
        queue.shift()
        if (queue.length > 0) {
          return step(queue[0]).then(f).catch((err) => { handlers.onerror(err) })
        } else if (stopEvt != null) {
          handlers.onstop(stopEvt)
        }
      }
      step(queue[0]).then(f).catch((err) => { handlers.onerror(err) })
    }
    input.onstop = (evt) => {
      if (queue.length == 0) {
        handlers.onstop(evt)
      } else {
        stopEvt = evt
      }
    }
    input.onerror = (evt, msg) => { handlers.onerror(evt, msg) }

    return handlers
  }
}
exports.verifyPath = verifyPath

// decodeFile reads a chunked file in MerkleDAG format. It outputs the parsed
// chunks.
function decodeFile(input) {
  let ondata = (evt, cb) => {
    if (evt.data[0] == 0) {
      cb({raw: evt.data.subarray(1), links: [], data: evt.data.subarray(1)})
    } else if (evt.data[0] == 1) {
      try {
        let node = dagPB.util.deserialize(evt.data.subarray(1))

        let file = Unixfs.unmarshal(node.Data)
        if (file.type != "raw" && file.type != "file") {
          throw new Error("got unexpected file type, wanted raw or file")
        }
        if (file.data == null) {
          file.data = Buffer.alloc(0)
        }

        cb({raw: evt.data.subarray(1), links: node.Links, data: file.data})
      } catch (err) {
        cb(null, err)
      }
    } else {
      cb(null, new Error("failed to decode a chunk of file data"))
    }
  }

  return asynchronous(input, ondata)
}
exports.decodeFile = decodeFile

// hashChunks converts the `raw` field of an event into a `digest` field which
// is the cryptographic hash of `raw`.
//
// This is given its own function to make it easy to support new hash
// algorithms: this stream needs state to know which hash to use.
function hashChunks(input) {
  let ondata = (evt, cb) => {
    crypto.subtle.digest("SHA-256", evt.raw).then((digest) => {
      let mh = multihash.encode(Buffer.from(digest), "sha2-256")
      cb({multihash: mh, links: evt.links, data: evt.data})
    }).catch((err) => { cb(null, err) })
  }

  return asynchronous(input, ondata)
}
exports.hashChunks = hashChunks

// verifyContent makes sure that each chunk of the page is correct, and will
// refuse to forward chunks that fail validation.
function verifyContent(input) {
  let handlers = {
    onstart: (evt) => {},
    ondata: (evt) => {},
    onstop: (evt) => {},
    onerror: (evt, msg) => {},
  }

  let walk = null

  input.onstart = (evt) => {
    walk = new verify.TreeWalk(evt.multihash)
    handlers.onstart(evt)
  }
  input.ondata = (evt) => {
    if (!walk.step(evt.multihash, evt.links)) {
      handlers.onerror(new Error("given unexpected data"))
      return
    }
    handlers.ondata(evt)
  }
  input.onstop = (evt) => {
    if (walk != null && !walk.done) {
      // TODO: Find a way to communicate this error to the user?
      handlers.onerror(new Error("not all content was received"))
      return
    }
    handlers.onstop(evt)
  }
  input.onerror = (evt, msg) => { handlers.onerror(evt, msg) }

  return handlers
}
exports.verifyContent = verifyContent
