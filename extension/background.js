let port = browser.runtime.connectNative("aa_torrent_dl_native");

// log plaintext to console, emit notifications for structured data.
port.onMessage.addListener((response) => {
  if (typeof(response) == "string") {
    console.log("Received: " + response);
  } else {
    title = null
    message = null
    if (response.notification_type == "added") {
      title = "Added download";
      message = response.name + " has been added to qBittorrent.";
    }
    if (response.notification_type == "downloading") {
      title = "Starting download";
      message = response.name + " is beginning to download.";
    }
    if (response.notification_type == "finished") {
      title = "Finished download";
      message = response.name + " has finished downloading.";
    }

    browser.notifications.create({
      type: "basic",
      iconUrl: browser.extension.getURL("icons/a.svg"),
      title: title,
      message: message
    })
  }
});

/*
Listen for the native messaging port closing.
*/
port.onDisconnect.addListener((port) => {
  if (port.error) {
    console.log(`Disconnected due to an error: ${port.error.message}`);
  } else {
    // The port closed for an unspecified reason. If this occurred right after
    // calling `browser.runtime.connectNative()` there may have been a problem
    // starting the the native messaging client in the first place.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging#troubleshooting
    console.log(`Disconnected`, port);
  }
});

// query torrent-link, torrent-filename, and target-filename from current tab,
// then send download-command to native app.
browser.browserAction.onClicked.addListener(() => {
  executing = browser.tabs.executeScript({
    code: `
    valid_filetypes = [
      "pdf",
      "epub",
      "zip",
      "mobi",
      "fb2",
      "cbr",
      "djvu",
      "cbz",
      "txt",
      "azw3",
      "doc",
      "lit",
      "rtf",
      "rar",
      "htm",
      "html",
      "mht",
      "docx",
      "lrf",
      "jpg",
      "opf",
      "chm",
      "azw",
      "pdb",
      "odt",
      "ppt",
      "xls",
      "xlsx",
      "prc",
      "tar",
      "tif",
      "snb",
      "updb",
      "htmlz",
      "7z",
      "cb7",
      "gz",
      "pptx",
      "ai"
    ]

    doc_metadata = document.getElementsByClassName("text-gray-800")[0].innerText.toLowerCase().split(" · ")

    // filetype is either first or second entry.
    // Usually the language comes first, but some documents don't have a
    // language associated, in which case the doctype comes first.
    doc_ft = undefined
    loop1: for (let md of [doc_metadata[1], doc_metadata[0]]) {
      for (let ft of valid_filetypes) {
        if (md == ft) {
          doc_ft = ft
          break loop1;
        }
      }
    }

    if (doc_ft == undefined)
      doc_ft = "dat"

    name = document.title.replace(" - Anna’s Archive", "");

    torrent_description_nodes = document.evaluate(
      '//a[contains(text(), "Bulk torrent downloads")]/parent::*/div',
      document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
    )

    torrentfile = null;
    torrentlink = null;
    for (let i = 0; i < torrent_description_nodes.snapshotLength; i++) {
      node = torrent_description_nodes.snapshotItem(i)
      text = node.textContent
      if (text.match("\(extract\)"))
        continue;

      torrentfile = text.match(".*file.“([^”]+)”$")[1]
      torrentlink = node.childNodes[3].href
    }
    if (torrentfile == null)
      throw new Error("EXTRACT_ONLY_ERR")

    res = {docname: name, doctype: doc_ft, torrent_link: torrentlink, torrent_target_file: torrentfile};
    res
    `
  });
  executing.then((result) => {
    res = result[0]
    console.assert(res.torrent_link != null, "script did not return expected results.")
    res.command = "download"
    msg = res
    console.log("Sending: " + msg);
    port.postMessage(msg);
  }, (err) => {
    errmsg = null
    if (err.message == "EXTRACT_ONLY_ERR")
      errmsg = "Could not find any torrents on this page, or only torrents that require a full download (tar archive)."
    else
      errmsg = "Unknown error while looking for torrent: " + err.msg

    browser.notifications.create({
      type: "basic",
      iconUrl: browser.extension.getURL("icons/a.svg"),
      title: "No viable torrent found on page.",
      message: errmsg
    })
  });
});
