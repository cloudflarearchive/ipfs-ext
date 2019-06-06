function isGateway(url) {
  return (
    url.hostname == "localhost" ||
    url.hostname == "cloudflare-ipfs.com" ||
    url.hostname == "www.cloudflare-ipfs.com"
  ) && (
    url.pathname.startsWith("/ipfs/") ||
    url.pathname.startsWith("/ipns/")
  )
}
exports.isGateway = isGateway

function isSubdomainGateway(url) {
  return url.hostname != "www.cf-ipfs.com" &&
    url.hostname.endsWith(".cf-ipfs.com")
}
exports.isSubdomainGateway = isSubdomainGateway

function subdomainHash(url) {
  return url.hostname.slice(0, -1 * ".cf-ipfs.com".length)
}
exports.subdomainHash = subdomainHash

function isSecure(url) {
  return isGateway(url) || isSubdomainGateway(url) || url.hostname.startsWith("ipfs-sec.")
}
exports.isSecure = isSecure
