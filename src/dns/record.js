// NOTE(brendan): This file is a port of the same functionality from a Golang
// implementation at: github.com/miekg/dns.

const wire = require("./wire.js")

const algorithmToHash = {
  [wire.Algorithm.RSASHA1]:         "SHA-1",
  [wire.Algorithm.RSASHA256]:       "SHA-256",
  [wire.Algorithm.ECDSAP256SHA256]: "SHA-256",
}

const year68 = 1 << 31

function DNSKEYtoDS(key, h) {
  let ds = {
    hdr: {
      name: key.hdr.name,
      rrtype: wire.Type.DS,
      rrclass: key.hdr.rrclass,
      ttl: key.hdr.ttl,
    },
    // keyTag: ...,
    algorithm: key.algorithm,
    digestType: h,
  }

  let [ , off0] = wire.unpackDomainName(key._raw, 0);
  let [ , off1] = wire.unpackHdr(key._raw, 0);

  let data = Buffer.alloc(off0 + (key._raw.length-off1))
  key._raw.copy(data, 0, 0, off0)
  key._raw.copy(data, off0, off1)

  let hasher
  switch(h) {
    case wire.Hash.SHA1:
      hasher = crypto.subtle.digest("SHA-1", data)
      break
    case wire.Hash.SHA256:
      hasher = crypto.subtle.digest("SHA-256", data)
      break
    default:
      throw new Error("unknown hash algorithm")
  }

  return hasher.then((raw) => {
    ds.digest = Buffer.from(raw)
    return ds
  })
}
exports.DNSKEYtoDS = DNSKEYtoDS

function base64url(data) {
  return data.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function parseRSA(publicKey) {
  let explen = publicKey.readUInt8(0), expoff = 1
  if (explen == 0) {
    explen = publicKey.readUInt16BE(1)
    expoff = 3
  }
  if (explen > 4 || explen == 0 || publicKey[expoff] == 0) {
    throw new Error("bad key")
  }

  let modoff = expoff+explen, modlen = publicKey.length-modoff
  if (modlen < 64 || modlen > 512 || publicKey[modoff] == 0) {
    throw new Error("bad key")
  }

  return {
    kty: "RSA",
    e: base64url(publicKey.slice(expoff, expoff+explen)),
    n: base64url(publicKey.slice(modoff, modoff+modlen)),
  }
}

function parseECDSA(publicKey) {
  if (publicKey.length != 64) {
    throw new Error("bad key")
  }
  return {
    kty: "EC",
    crv: "P-256",
    x: base64url(publicKey.slice(0, 32)),
    y: base64url(publicKey.slice(32, 64)),
  }
}

function compareMsgs(a, b) {
  let [ , off0] = wire.unpackHdr(a._raw, 0);
  let [ , off1] = wire.unpackHdr(b._raw, 0);

  a = a._raw.slice(off0)
  b = b._raw.slice(off1)

  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] < b[i]) {
      return -1
    } else if (b[i] < a[i]) {
      return 1
    }
  }
  if (a.length < b.length) {
    return -1
  } else if (b.length < a.length) {
    return 1
  }
  return 0
}

function verifySignature(sig, key, rrset) {
  // First easy checks.
  if (sig.hdr.rrclass != key.hdr.rrclass) {
    throw new Error("bad key")
  } else if (sig.algorithm != key.algorithm) {
    throw new Error("bad key")
  } else if (sig.signerName.toLowerCase() != key.hdr.name.toLowerCase()) {
    throw new Error("bad key")
  } else if (key.protocol != 3) {
    throw new Error("bad key")
  }

  if (rrset.length == 0) {
    throw new Error("bad rrset")
  }
  for (let rr of rrset) {
    if (rr.hdr.class != sig.hdr.class) {
      throw new Error("bad rrset")
    } else if (rr.hdr.rrtype != sig.typeCovered) {
      throw new Error("bad rrset")
    }
  }

  // Compute the signed data.
  let datas = []

  let [ , off0] = wire.unpackHdr(sig._raw, 0)
  let [ , off1] = wire.unpackDomainName(sig._raw, off0+18)
  datas.push(sig._raw.slice(off0, off1))

  rrset.sort(compareMsgs)
  for (let i = 0; i < rrset.length; i++) {
    if (i > 0 && rrset[i]._raw.equals(rrset[i-1]._raw)) {
      continue
    }
    datas.push(rrset[i]._raw)
  }

  let data = Buffer.concat(datas)

  // Verify signature.
  let opts = {
    name: "RSASSA-PKCS1-v1_5",
    hash: {name: algorithmToHash[sig.algorithm]},
  }
  if (opts.hash.name == null) {
    throw new Error("hash algorithm not defined for signature algorithm")
  }

  let importer
  switch(sig.algorithm) {
    case wire.Algorithm.RSASHA1:
    case wire.Algorithm.RSASHA256:
      opts.name ="RSASSA-PKCS1-v1_5"
      importer = crypto.subtle.importKey(
        "jwk", parseRSA(key.publicKey), opts, false, ["verify"],
      )
      break
    case wire.Algorithm.ECDSAP256SHA256:
      opts.name = "ECDSA",
      importer = crypto.subtle.importKey(
        "jwk", parseECDSA(key.publicKey), opts, false, ["verify"],
      )
      break
    default:
      throw new Error("unknown signature algorithm")
  }

  return importer.then((publicKey) => {
    return crypto.subtle.verify(opts, publicKey, sig.signature, data)
  })
}
exports.verifySignature = verifySignature

function signatureCurrent(sig) {
  let utc = Math.round((new Date()).getTime() / 1000)

  let modi = Math.floor((sig.inception - utc) / year68)
  let mode = Math.floor((sig.expiration - utc) / year68)
  let ti = sig.inception + (modi*year68)
  let te = sig.expiration + (mode*year68)

  return ti <= utc && utc <= (te + 24*60*60)
}
exports.signatureCurrent = signatureCurrent
