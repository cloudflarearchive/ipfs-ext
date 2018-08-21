const protons = require("protons")

const dnssec = require("./dnssec.js")
const proto = protons(require("./result.proto.js"))
const record = require("./record.js")
const wire = require("./wire.js")

const rootDigests = [
  {
    hdr: {
      name:     ".",
      rrtype:   0x2b,
      rrclass:  0x01,
      ttl:      0x1ed8,
      rdlength: 0x00,
    },
    keyTag:     0x4a5c,
    algorithm:  0x08,
    digestType: 0x02,
    digest:     Buffer.from("49aac11d7b6f6446702e54a1607371607a1a41855200fd2ce1cdde32f24e8fb5", "hex"),
  },
  {
    hdr: {
      name:     ".",
      rrtype:   0x2b,
      rrclass:  0x01,
      ttl:      0x1ed8,
      rdlength: 0x00,
    },
    keyTag:     0x4f66,
    algorithm:  0x08,
    digestType: 0x02,
    digest:     Buffer.from("e06d44b80b8f1d39a95c0b0d7c65d08458e880409bbc683457104237c7f8ec8d", "hex"),
  },
]

function parseRR(data, rrtype) {
  let [rr, ] = wire.unpackRR(data, 0)
  if (rr.hdr.rrtype != rrtype) {
    throw new Error("unexpected rrtype")
  }
  return rr
}

function parseRRs(datas, rrtype) {
  let rrset = []
  for (let data of datas) {
    rrset.push(parseRR(data, rrtype))
  }
  return rrset
}

class Result {
  constructor(raw) {
    let parsed = proto.Result.decode(raw)

    this.delegations = []
    for (let deleg of parsed.Delegations) {
      this.delegations.push({
        keys:    parseRRs(deleg.Keys, wire.Type.DNSKEY),
        digests: parseRRs(deleg.Digests, wire.Type.DS),

        keySig:    parseRR(deleg.KeySig, wire.Type.RRSIG),
        digestSig: parseRR(deleg.DigestSig, wire.Type.RRSIG),
      })
    }

    this.keys = parseRRs(parsed.Keys, wire.Type.DNSKEY)
    this.data = parseRRs(parsed.Data, wire.Type.TXT)

    this.keySig = parseRR(parsed.KeySig, wire.Type.RRSIG)
    this.dataSig = parseRR(parsed.DataSig, wire.Type.RRSIG)
  }

  txt(name) {
    name = wire.fqdn(name).toLowerCase()

    let out = []
    for (let rr of this.data) {
      if (rr.hdr.name != name) {
        throw new Error("unexpected record name")
      }
      out.push(rr.txt.join(""))
    }
    return out
  }

  async verify() {
    let digests = rootDigests
    for (let deleg of this.delegations) {
      let keysOk = await dnssec.verifyKeyset(digests, deleg.keys, deleg.keySig)
      if (!keysOk) {
        return false
      }
      let dsOk = await dnssec.verifyRecs(deleg.keys, deleg.digests, deleg.digestSig)
      if (!dsOk) {
        return false
      }
      digests = deleg.digests
    }

    let keysOk = await dnssec.verifyKeyset(digests, this.keys, this.keySig)
    if (!keysOk) {
      return false
    }
    let dataOk = await dnssec.verifyRecs(this.keys, this.data, this.dataSig)
    if (!dataOk) {
      return false
    }

    return true
  }
}
exports.Result = Result
