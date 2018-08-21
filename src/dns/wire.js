// NOTE(brendan): This file is a port of the same functionality from a Golang
// implementation at: github.com/miekg/dns.

const Type = {
  TXT:    16,
  DS:     43,
  RRSIG:  46,
  DNSKEY: 48,
}
exports.Type = Type

const Hash = {
  SHA1:   1,
  SHA256: 2,
}
exports.Hash = Hash

const Algorithm = {
  RSASHA1:          5,
  RSASHA256:        8,
  ECDSAP256SHA256: 13,
}
exports.Algorithm = Algorithm

const Flags = {
  SEP:    1,
  ZONE: 256,
}
exports.Flags = Flags

function unpackDomainName(msg, off) {
  let s = ""
  let maxlen = 255

  loop:
  for (;;) {
    let c = msg.readUInt8(off)
    off++
    switch(c & 0xC0) {
      case 0x00:
        if (c == 0x00) { // End of name.
          break loop
        }
        // Literal string.
        for (let j = off; j < off+c; j++) {
          let b = msg.readUInt8(j), bChar = String.fromCharCode(b)
          switch(bChar) {
            case ".":
            case "(":
            case ")":
            case ";":
            case " ":
            case "@":
            case "\"":
            case "\\":
              s = s+"\\"+bChar
              maxlen++
              break
            default:
              if (b < 32 || b >= 127) { // Un-printable, use \DDD
                s = s+"\\"+("000" + b).substr(-3, 3)
              } else {
                s = s+bChar
              }
          }
        }
        s = s+"."
        off += c
        break
      default:
        throw new Error("bad rdata")
    }
  }
  if (s.length == 0) {
    s = "."
  } else if (s.length >= maxlen) {
    throw new Error("domain name exceeded 255 wire-format octets")
  }
  return [s, off]
}
exports.unpackDomainName = unpackDomainName

function unpackTxtString(msg, off) {
  let l = msg.readUInt8(off), s = ""

  for (let j = off+1; j < off+1+l; j++) {
    let b = msg.readUInt8(j), bChar = String.fromCharCode(b)
    switch(bChar) {
      case "\"":
      case "\\":
        s = s+"\\"+bChar
        break
      default:
        if (b < 32 || b >= 127) { // NOTE: miekg allows b == 127?
            s = s+"\\"+("000" + b).substr(-3, 3)
        } else {
          s = s+bChar
        }
    }
  }

  return [s, off+1+l]
}

function unpackTxt(msg, off) {
  let s = "", ss = []
  for (; off < msg.length;) {
    [s, off] = unpackTxtString(msg, off);
    ss.push(s)
  }
  return [ss, off]
}

function unpackBase64(msg, off, end) {
  return [msg.slice(off, end), end]
}

function unpackUint8(msg, off) { return [msg.readUInt8(off), off+1] }
function unpackUint16(msg, off) { return [msg.readUInt16BE(off), off+2] }
function unpackUint32(msg, off) { return [msg.readUInt32BE(off), off+4] }

function unpackHdr(msg, off) {
  let hdr = {};

  [hdr.name, off] = unpackDomainName(msg, off);
  [hdr.rrtype, off] = unpackUint16(msg, off);
  [hdr.rrclass, off] = unpackUint16(msg, off);
  [hdr.ttl, off] = unpackUint32(msg, off);
  [hdr.rdlength, off] = unpackUint16(msg, off);

  if (off+hdr.rdlength < msg.length) {
    throw new Error("overflowing header size")
  }
  return [hdr, off]
}
exports.unpackHdr = unpackHdr

function unpackTXT(rr, msg, off) {
  if (rr.hdr.rdlength == 0) {
    return off
  }

  [rr.txt, off] = unpackTxt(msg, off);

  return off
}

function unpackDS(rr, msg, off) {
  if (rr.hdr.rdlength == 0) {
    return
  }
  let rdstart = off;

  [rr.keyTag, off] = unpackUint16(msg, off);
  [rr.algorithm, off] = unpackUint8(msg, off);
  [rr.digestType, off] = unpackUint8(msg, off);
  [rr.digest, off] = unpackBase64(msg, off, rdstart+rr.hdr.rdlength)

  return off
}

function unpackRRSIG(rr, msg, off) {
  if (rr.hdr.rdlength == 0) {
    return off
  }
  let rdstart = off;

  [rr.typeCovered, off] = unpackUint16(msg, off);
  [rr.algorithm, off] = unpackUint8(msg, off);
  [rr.labels, off] = unpackUint8(msg, off);
  [rr.origTtl, off] = unpackUint32(msg, off);
  [rr.expiration, off] = unpackUint32(msg, off);
  [rr.inception, off] = unpackUint32(msg, off);
  [rr.keyTag, off] = unpackUint16(msg, off);
  [rr.signerName, off] = unpackDomainName(msg, off);
  [rr.signature, off] = unpackBase64(msg, off, rdstart+rr.hdr.rdlength);

  return off
}

function unpackDNSKEY(rr, msg, off) {
  if (rr.hdr.rdlength == 0) {
    return
  }
  let rdstart = off;

  [rr.flags, off] = unpackUint16(msg, off);
  [rr.protocol, off] = unpackUint8(msg, off);
  [rr.algorithm, off] = unpackUint8(msg, off);
  [rr.publicKey, off] = unpackBase64(msg, off, rdstart+rr.hdr.rdlength);

  return off
}

function unpackRR(msg, off) {
  let rdstart = off
  let rr = {};

  [rr.hdr, off] = unpackHdr(msg, 0);
  switch(rr.hdr.rrtype) {
    case Type.TXT:
      off = unpackTXT(rr, msg, off)
      break
    case Type.DS:
      off = unpackDS(rr, msg, off)
      break
    case Type.RRSIG:
      off = unpackRRSIG(rr, msg, off)
      break
    case Type.DNSKEY:
      off = unpackDNSKEY(rr, msg, off)
      break
    default:
      throw new Error("unknown record type")
  }

  rr._raw = msg.slice(rdstart, off)
  return [rr, off]
}
exports.unpackRR = unpackRR

function isFqdn(s) {
  return s.endsWith(".")
}
exports.isFqdn = isFqdn

function fqdn(s) {
  if (isFqdn(s)) {
    return s
  }
  return s + "."
}
exports.fqdn = fqdn
