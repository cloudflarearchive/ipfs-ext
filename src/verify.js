const CID = require("cids")
const dagPB = require("ipld-dag-pb")
const ipns = require("ipns")
const keys = require("libp2p-crypto").keys
const multihash = require("multihashes")
const PeerId = require("peer-id")
const protons = require("protons")
const unixfsData = protons(require("ipfs-unixfs/src/unixfs.proto.js")).Data

const dns = require("./dns/")
const util = require("./util.js")

function join(a, b) {
  let c = []

  for (let x of a) {
    c.push(x)
  }
  for (let y of b) {
    c.push(y)
  }

  return c
}

// Path verifies each step in a path /ipns/{{ domain name }}/dir1/dir2/file.txt
// until we get to a base /ipfs/{{ CID }}.
class Path {
  constructor(url) {
    let pathname = url.pathname
    if (pathname.length == 0 || pathname[0] != "/") {
      pathname = "/" + pathname
    }
    if (util.isSubdomainGateway(url)) {
      pathname = "/ipfs/" + util.subdomainHash(url) + pathname
    } else if (!util.isGateway(url)) {
      pathname = "/ipns/" + url.hostname + pathname
    }
    let segments = pathname.replace(/\/+/gi, "/").replace(/\/$/, "").split("/")
    if (segments.length < 3 || segments[0] != "" || (segments[1] != "ipfs" && segments[1] != "ipns")) {
      throw new Error("unable to parse path")
    }
    segments = segments.map((segment) => decodeURIComponent(segment))

    this.hamt = false // hamt is true if we're currently traversing a HAMT.
    this.website = null // website is the website CID as a string.
    this.page = null // page is the page CID as a string.
    this.segments = segments // segments is the /-split URL.

    if (this.segments[1] == "ipfs") {
      this.segments[2] = this.parse(this.segments[2])
    }
  }

  parse(segment) {
    let cid = new CID(segment)

    if (this.website == null) this.website = cid.toBaseEncodedString()
    this.page = cid.toBaseEncodedString()

    return cid.multihash
  }

  // step takes the next section of the response preamble as input, and tries to
  // use it to resolve the next step in the path.
  async step(data) {
    if (this.segments[1] == "ipns" && data[0] == 0) { // DNS name.
      return this.stepDNS(data.subarray(1))
    } else if (this.segments[1] == "ipns" && data[0] == 1) { // IPNS name.
      return this.stepIPNS(data.subarray(1))
    } else if (this.segments[1] == "ipfs" && data[0] == 0) { // Step into a directory.
      return this.stepDir(data.subarray(1))
    } else if (this.segments[1] == "ipfs" && data[0] == 1) { // Step into a HAMT shard.
      return this.stepHAMT(data.subarray(1))
    } else {
      throw new Error("unrecognized step while verifying path")
    }
  }

  async stepDNS(data) {
    let res = new dns.Result(data)
    let ok = await res.verify()
    if (!ok) {
      throw new Error("failed to validate DNSSEC proof")
    }
    let txts = res.txt("_dnslink." + this.segments[2])

    for (let txt of txts) {
      if (txt.startsWith("dnslink=")) {
        let temp = txt.slice("dnslink=".length).replace(/\/+/gi, "/").replace(/\/$/, "").split("/")
        if (temp.length >= 3 && temp[0] == "" && (temp[1] == "ipfs" || temp[1] == "ipns")) {
          if (temp[1] == "ipfs") {
            temp[2] = this.parse(temp[2])
          }
          // Replace /ipns/example.com with the value of the TXT record.
          this.segments = join(temp, this.segments.slice(3))
          return
        }
      }
    }

    throw new Error("no suitable txt records found in dns output")
  }

  async stepIPNS(data) {
    let peer = PeerId.createFromB58String(this.segments[2])
    let parsed = ipns.unmarshal(data)

    let publicKey = await this.ipnsPublicKey(peer, parsed)

    return new Promise((resolve, reject) => {
      ipns.validate(publicKey, parsed, (err) => {
        if (err != null) {
          reject(err)
          return
        }
        let temp = parsed.value.toString().replace(/\/+/gi, "/").replace(/\/$/, "").split("/")
        if (temp.length >= 3 && temp[0] == "" && (temp[1] == "ipfs" || temp[1] == "ipns")) {
          if (temp[1] == "ipfs") {
            temp[2] = this.parse(temp[2])
          }
          this.segments = join(temp, this.segments.slice(3))
        }
        resolve()
      })
    })
  }

  async ipnsPublicKey(peer, parsed) {
    let raw = peer.toBytes()

    // Check if the public key is just embedded in the peer ID.
    if (raw.length > 1 && raw[0] == 0x00) {
      return keys.unmarshalPublicKey(raw)
    }

    // Extract the public key from the IPNS record.
    return crypto.subtle.digest("SHA-256", parsed.pubKey).then((digest) => {
      let mh = multihash.encode(Buffer.from(digest), "sha2-256")
      if (!raw.equals(mh)) {
        throw new Error("given unexpected public key")
      }
      return keys.unmarshalPublicKey(parsed.pubKey)
    })
  }

  async stepDir(data) {
    let digest = await crypto.subtle.digest("SHA-256", data)
    let mh = multihash.encode(Buffer.from(digest), "sha2-256")
    if (!this.segments[2].equals(mh)) {
      throw new Error("given unexpected data")
    }

    return new Promise((resolve, reject) => {
      dagPB.util.deserialize(data, (err, node) => {
        if (err != null) {
          reject(new Error("error parsing node:" + err))
          return
        }
        let link = node.links.find((link) => link.name == this.segments[3])
        if (link == null) {
          reject(new Error("link with desired name not found"))
          return
        }
        let mh = this.parse(link.multihash)

        this.segments = join(["", "ipfs", mh], this.segments.slice(4))
        resolve()
      })
    })
  }

  async stepHAMT(data) {
    this.hamt = true

    let nameLen = (65536*data[0]) + (256*data[1]) + data[2]
    let name = data.slice(3, 3+nameLen).toString()
    let rest = data.slice(3+nameLen)

    let digest = await crypto.subtle.digest("SHA-256", rest)
    let mh = multihash.encode(Buffer.from(digest), "sha2-256")
    if (!this.segments[2].equals(mh)) {
      throw new Error("given unexpected data")
    }

    return new Promise((resolve, reject) => {
      dagPB.util.deserialize(rest, (err, node) => {
        if (err != null) {
          reject(new Error("error parsing node:" + err))
          return
        }
        let folder = unixfsData.decode(node.data)
        if (folder.Type != unixfsData.DataType.HAMTShard) {
          reject(new Error("got unexpected file type, wanted hamt sharded directory"))
          return
        }
        let padlen = (folder.fanout-1).toString(16).length

        let link = node.links.find((link) => link.name == name)
        if (link == null) {
          reject(new Error("link with desired name not found"))
          return
        }
        let mh = this.parse(link.multihash)

        // Check if we're at an intermediate node in the tree. If so, mindlessly
        // step down to the child node we were told to.
        if (link.name.length == padlen) {
          this.segments[2] = mh
          resolve()
          return
        }

        // We're at a leaf node. Verify that this is the next step in the path
        // we've been waiting for, and if it is, then step down.
        if (link.name.slice(padlen) == this.segments[3]) {
          this.hamt = false
          this.segments = join(["", "ipfs", mh], this.segments.slice(4))
          resolve()
          return
        }

        reject(new Error("search through sharded directory ended at unexpected node"))
        return
      })
    })
  }

  // done returns true if we've resolved the path to a base CID.
  get done() {
    return this.segments.length == 3 && this.segments[1] == "ipfs" && !this.hamt
  }

  // multihash returns the multihash of the page's content as a Buffer. `done`
  // must be true to call this.
  get multihash() {
    return this.segments[2]
  }
}
exports.Path = Path

// TreeWalk incrementally verifies that each chunk of a file is correct as it is
// delivered. Large files are structured like a Merkle Tree, where the file's
// contents are reconstructed by walking the Merkle Tree.
class TreeWalk {
  constructor(root) {
    this.stack = {
      links: [root],
      prev: null,
    }
  }

  // step returns true if `cid` was the next piece of content we expected to
  // see, and false if not.
  step(mh, links) {
    if (this.stack == null || this.stack.links.length == 0) {
      return false
    } else if (!this.stack.links[0].equals(mh)) {
      return false
    }
    this.stack.links = this.stack.links.slice(1)

    if (links == null) {
      links = []
    }
    links = links.map((link) => (new CID(link.multihash)).multihash)

    let stepDone = this.stack.links.length == 0
    let subLinks = links.length > 0

    if (stepDone && subLinks) {
      this.stack.links = links
    } else if (stepDone && !subLinks) {
      this.stack = this.stack.prev
    } else if (!stepDone && subLinks) {
      this.stack = {
        links: links,
        prev: this.stack,
      }
    } // else if (!stepDone && !subLinks) {{ // Do nothing. }}

    return true
  }

  // done returns true if we expect the walk to be complete.
  get done() {
    return this.stack == null
  }
}
exports.TreeWalk = TreeWalk
