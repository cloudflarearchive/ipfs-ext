# IPFS Gateway Validator

> Validates IPFS resources served by Cloudflare's gateway.

This repo contains the source code for a browser extension that intercepts
requests to IPFS gateways and distinguished domain names, and cryptographically
verifies that the server's response is valid. It currently only works in Firefox
because Firefox is the only browser that supports the
[webRequest.filterResponseData()](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/filterResponseData)
API.

Currently, it intercepts any request to:
- Cloudflare's gateway, https://cloudflare-ipfs.com
- Any domain starting with "ipfs-sec.". For example, [ipfs-sec.stackexchange.cloudflare-ipfs.com](https://ipfs-sec.stackexchange.cloudflare-ipfs.com/index.html).


## What are ipfs-sec domains for?

ipfs-sec domains have several security and usability properties that make them
ideal for building trust-minimizing web apps.

Unlike requests served by a communal or local gateway, ipfs-sec domains are
considered by the browser as a distinct origin. This means they have a safe
place to store cookies and local data, can request special permissions from the
user, and can run service workers free from manipulation by malicious
third-party documents.

Web apps with an ipfs-sec domain can be served by a CDN to reduce their
operational cost and load time through caching, as well as provide protection
from DDoS attacks. However, unlike with a traditional web app, the website owner
is assured that the CDN cannot maliciously modify his content. The user could
also be assured that the website owner hasn't maliciously modified their own web
app through the use of a [Certificate
Transparency](https://www.certificate-transparency.org/)-like system for DNS,
though this is not currently implemented.

Finally, ipfs-sec domains are backwards-compatible. Users that don't want to
install the extension will be served the same content as users that do have the
extension, they just won't get the security benefits.

You can read more about ipfs-sec, including how to create an ipfs-sec website,
in our blog post about [end-to-end
integrity](https://blog.cloudflare.com/e2e-integrity/).


## How do I build the extension?

```
npm run build
```

## Notes

- Only the SHA-256 hashing algorithm is currently supported for content IDs.
- Storing IPFS hashes in TXT records is supported, but the name for the TXT record *must* be prefixed with "\_dnslink".
