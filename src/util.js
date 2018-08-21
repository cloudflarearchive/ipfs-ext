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

function isSecure(url) {
  return isGateway(url) || url.hostname.startsWith("ipfs-sec.")
}
exports.isSecure = isSecure
