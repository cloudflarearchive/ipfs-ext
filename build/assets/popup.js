function writeText(parent, text) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }
  parent.appendChild(document.createTextNode(text))
}

browser.runtime.sendMessage({}).then((data) => {
  writeText(document.getElementById("header-origin"), data.hostname)

  if (data.error != null) {
    document.getElementById("icon").src = "large_error.png"
    writeText(document.getElementById("sub-header"), "Content validation failed.")
    document.getElementById("error-addendum").style.display="initial"
    writeText(document.getElementById("error-msg"), data.error.replace(/^Error: /, ""))
    return
  }

  if (data.cached) {
    document.getElementById("cache-notice").style.display = "initial"
  } else {
    writeText(document.getElementById("content-website"), data.website)
    writeText(document.getElementById("content-page"), data.page)
    document.getElementById("content-table").style.display = "initial"
  }

  if (data.gateway) {
    document.getElementById("gateway-separator").style.display = "initial"
    document.getElementById("gateway-addendum").style.display = "initial"

    let warning = document.getElementById("gateway-warning")
    if (data.cached) {
      warning.style.width = "400px"
    } else {
      warning.style.width = document.getElementById("content-table").offsetWidth + "px"
    }
  }
}).catch((err) => {
  console.log(err)
})
