const util = require("./util.js")

// tabs maps tab ID to information about what host is shown in a tab, and the
// hashes of the content being shown.
let tabs = {}

function tabInfo(url, startEvt, err) {
  let out = {
    hostname: url.hostname,
    gateway:  util.isGateway(url),
  }
  if (err != null) {
    out.error = err.toString()
  }
  if (startEvt == null) {
    out.cached = true
  } else {
    out.cached = false
    out.website = startEvt.website
    out.page = startEvt.page
  }
  return out
}

// show triggers the page action icon to be shown on a tab.
function show(details, url, startEvt, err) {
  if (details.type != "main_frame") {
    return
  }
  tabs[details.tabId] = tabInfo(url, startEvt, err)

  if (err != null) {
    browser.pageAction.setIcon({
      path: {32: "assets/small_error.png"},
      tabId: details.tabId,
    })
  }
  browser.pageAction.show(details.tabId)
}
exports.show = show

// Register a listener to remove stored information about a tab when the tab is
// closed.
browser.tabs.onRemoved.addListener((tab) => {
  if (tab.id == browser.tabs.TAB_ID_NONE) {
    return
  }
  delete tabs[tab.id]
})

// Register a listener to respond to queries from the Page Action popup, about
// the state of its page.
browser.runtime.onMessage.addListener((request) => {
  return browser.tabs.query({currentWindow: true, active: true}).then((res) => {
    if (res.length != 1) {
      throw new Error("unexpected number of tabs returned, wanted single active tab")
    }
    return tabs[res[0].id]
  })
})
