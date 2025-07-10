Mechanism:
* Click on browser extension while on annas-archive site.
* get website text (firefox has api, for sure), use xpath to get link to
  torrent-file and filename of book.
* send native message
  (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging)
  to python program like magazine-downloader, link to torrent and filename
  (enough for it!)
  * Substep: create that app, maybe extract logic for making sure some torrent
    is downloading only that one file.
    Difficult(maybe!): think about what happens when two active downloads need a
    file from the same torrent.
  * native app sends back progress and moves file once completed.
# Communication protocol
Send json, utf-8 encoded.
## extension -> native
* new file:
```json
{
    "action": "download", // fixed!

    "target_name": "some-filename.extension",
    "torrent_link": "asdfasdf.torrent",
    "torrent_target_file": "filename"
}
```
