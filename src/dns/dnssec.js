const record = require("./record.js")
const wire = require("./wire.js")

async function verifyKeyset(digests, keys, sig) {
  if (!record.signatureCurrent(sig)) {
    return false
  }

  let dsPromises = []
  for (let key of keys) {
    if (key.flags&wire.Flags.ZONE == 0) {
      continue
    }
    let prom = record.DNSKEYtoDS(key, wire.Hash.SHA256).then((ds) => {
      return {key: key, ds: ds}
    })
    dsPromises.push(prom)
  }

  return Promise.all(dsPromises).then((computed) => {
    let verPromises = []

    for (let cand of computed) {
      for (let ds of digests) {
        let matches = cand.ds.algorithm == ds.algorithm &&
          cand.ds.digestType == ds.digestType &&
          cand.ds.digest.equals(ds.digest) &&
          cand.ds.hdr.name == ds.hdr.name
        if (!matches) {
          continue
        }
        try {
          verPromises.push(record.verifySignature(sig, cand.key, keys))
        } catch(err) {}
      }
    }

    return Promise.all(verPromises)
  }).then((oks) => {
    for (let ok of oks) {
      if (ok == true) {
        return true
      }
    }
    return false
  })
}
exports.verifyKeyset = verifyKeyset

async function verifyRecs(keys, recs, sig) {
  if (!record.signatureCurrent(sig)) {
    return false
  }

  let verPromises = []
  for (let key of keys) {
    if (key.flags&wire.Flags.ZONE == 0) {
      continue
    } else if (!suffixed(recs, key.hdr.name)) {
      continue
    }
    try {
      verPromises.push(record.verifySignature(sig, key, recs))
    } catch(err) {}
  }

  return Promise.all(verPromises).then((oks) => {
    for (let ok of oks) {
      if (ok == true) {
        return true
      }
    }
    return false
  })
}
exports.verifyRecs = verifyRecs

function suffixed(recs, parent) {
  let suffix = parent
  if (suffix != ".") {
    suffix = "."+suffix
  }

  for (let rr of recs) {
    if (rr.hdr.name != parent && !rr.hdr.name.endsWith(suffix)) {
      return false
    }
  }

  return true
}
