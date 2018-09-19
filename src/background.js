const pageAction = require("./page_action.js")
const stream = require("./stream.js")
const util = require("./util.js")

let blacklist = {}
function isBlacklisted(url) {
  if (!util.isGateway(url)) {
    return false
  }
  let parts = url.pathname.split("/")
  if (parts.length < 3 || parts[0] != "" || parts[1] != "ipns" || !parts[2].includes(".")) {
    return false
  }
  let name = parts[2], ts = blacklist[name]
  if (ts == null) {
    return false
  } else if (((new Date()).getTime() - ts) > 5*60*1000) {
    delete blacklist[name]
    return false
  }
  return true
}

// upgradeToSecure intercepts HTTP requests to secure IPFS domains and asks the
// browser to make the same request over HTTPS instead.
function upgradeToSecure(details) {
  let url = new URL(details.url)

  let upgrade = util.isSecure(url) && (url.port == "" || url.port == "80")
  if (upgrade) {
    return {upgradeToSecure: true}
  }
}
browser.webRequest.onBeforeRequest.addListener(
  upgradeToSecure, {urls: ["http://*/*"]}, ["blocking"],
)

const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)))

// passthrough is used when content validation is disabled. It displays a
// validation error and renders whatever is sent.
function passthrough(details, url) {
  console.log("skipping", details.url)

  let err = new Error("This domain does not support DNSSEC.")
  let first = true

  let filter = browser.webRequest.filterResponseData(details.requestId)
  filter.ondata = (evt) => {
    if (first) {
      pageAction.show(details, url, null, err)
      first = false
    }
    filter.write(evt.data)
  }
  filter.onstop = (evt) => {
    if (first) {
      pageAction.show(details, url, null, err)
      first = false
    }
    filter.close()
  }
}
// intercept checks if a request is to a secure IPFS domain, sets a header
// indicating that the client supports secure gateways, and then checks the
// response for cryptographic integrity.
function intercept(details) {
  let url = new URL(details.url)
  if (!util.isSecure(url)) {
    return
  } else if (isBlacklisted(url)) {
    return passthrough(details, url)
  }
  console.log("intercepting", details.url)

  let filter = browser.webRequest.filterResponseData(details.requestId)
  let processed = pipe(
    stream.decodeRLE, stream.verifyPath(url),
    stream.decodeFile, stream.hashChunks, stream.verifyContent,
  )(filter)

  let first = true, firstErr = true
  processed.onstart = (evt) => {
    if (first) {
      pageAction.show(details, url, evt)
      first = false
    }
  }
  processed.ondata = (evt) => {
    if (evt.data.byteLength > 0) {
      try {
        filter.write(evt.data)
      } catch(err) {
        console.log("failed to write to page: ", err, " (status="+filter.status+")")
      }
    }
  }
  processed.onstop = (evt) => {
    if (first) {
      pageAction.show(details, url)
      first = false
    }
    filter.close()
  }
  processed.onerror = (err, msg) => {
    if (err != null && err.srcElement != null && err.srcElement.error == "Channel redirected") {
      return
    }
    first = false
    if (firstErr) {
      pageAction.show(details, url, null, err)
      firstErr = false
    }
    console.log(err)

    if (msg != null && details.type == "main_frame") {
      let isDNS = /^ipfs resolve -r \/ipns\/.+: dns resolution:/.test(msg.toString())
      if (isDNS && util.isGateway(url)) {
        // The page failed to load because of a DNS issue. (Probably DNSSEC is not
        // setup.) Add the page to the blacklist and refresh.
        let parts = url.pathname.split("/")
        if (parts.length >= 3 && parts[0] == "" && parts[1] == "ipns" && parts[2].includes(".")) {
          blacklist[parts[2]] = (new Date()).getTime()
          browser.tabs.reload(details.tabId, {bypassCache: true})
        }
      } else {
        // Write error message to the main frame, so the user isn't left with a
        // blank screen and confused as to why nothing's happening.
        filter.write(msg)
      }
    }
    filter.close()
  }

  details.requestHeaders.push({name: "X-Ipfs-Secure-Gateway", value: "1"})
  return {requestHeaders: details.requestHeaders}
}
browser.webRequest.onBeforeSendHeaders.addListener(
  intercept, {urls: ["http://*/*", "https://*/*"]}, ["blocking", "requestHeaders"],
)

// preventRedirect stops any HTTP redirect, other than a redirect from a
// directory listing to the index of the directory.
function preventRedirect(details) {
  let url = new URL(details.url)
  if (!util.isSecure(url)) {
    return
  } else if (isBlacklisted(url)) {
    return
  }

  return {
    responseHeaders: details.responseHeaders.filter((hdr) => {
      let name = hdr.name.toLowerCase()

      if (name == "content-location") {
        return false
      } else if (name == "location") {
        let correct = (url.pathname + "/index.html").replace(/\/+/g, "/")
        return hdr.value == correct
      }

      return true
    }),
  }
}
browser.webRequest.onHeadersReceived.addListener(
  preventRedirect, {urls: ["http://*/*", "https://*/*"]}, ["blocking", "responseHeaders"],
)
