/*
On startup, connect to the "ping_pong" app.
*/
let port = browser.runtime.connectNative("aa_torrent_dl_native");

/*
Listen for messages from the app and log them to the console.
*/
port.onMessage.addListener((response) => {
  console.log("Received: " + response);
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

    torrentlink = document.evaluate(
      '//a[contains(text(), "Bulk torrent downloads")]/parent::*//a[contains(text(), ".torrent")]',
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue.href;

    torrentfile = document.evaluate(
      '//a[contains(text(), "Bulk torrent downloads")]/parent::*/div',
      document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
    ).singleNodeValue.textContent.match(".*file.“([^”]+)”")[1];

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
  });
});
