/*
On startup, connect to the "ping_pong" app.
*/
let port = browser.runtime.connectNative("aa_torrent_dl_native");

/*
Listen for messages from the app and log them to the console.
*/
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

/*
When the extension's action icon is clicked, send the app a message.
*/
browser.browserAction.onClicked.addListener(() => {
  executing = browser.tabs.executeScript({
    code: `
    ftype = document.getElementsByClassName("main")[0].children[0].getElementsByClassName("text-sm text-gray-500")[0].textContent.split(", ")[1];
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

    res = {target_name: name + ftype, torrent_link: torrentlink, torrent_target_file: torrentfile};
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
