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

    "docname": "some-name",
    "doctype": "<filetype>",
    "torrent_link": "asdfasdf.torrent",
    "torrent_target_file": "filename"
}
```
## native -> extension
* added download
```json
{
    "notifaction_type": "added",
    "name": "target_filename.epub"
}
```
* started download
```json
{
    "notifaction_type": "downloading",
    "name": "target_filename.epub"
}
```
* finished download
```json
{
    "notifaction_type": "finished",
    "name": "target_filename.epub",
}
```

# Testpages
* https://annas-archive.org/md5/c3a5022d3f084abf62fcf0af584983bf has (extract)
* https://annas-archive.org/md5/0bac07ed6b9959dbef87e84560250a77 has (extract)
* https://annas-archive.org/md5/b22b256cc09b1b3d33bf6ef0abc01f12 has multiple
  Bulk torrent downloads.
* https://annas-archive.org/md5/e848526f73cf166880fd62b7df3c6c54 256MiB piece-size
* https://annas-archive.org/md5/fdaca097e1337239b19dcf3d8a8e67cf 256MiB
  piece-size, good large file.
* https://annas-archive.org/md5/0c7a9bf1d1f83fe083d18316fe1dd734 does not have a
  language!

Some sites don't have a language before the filetype, explicitly filter for ^\.*

# Torrent-progress
Seems like prioritizing only works on a per-piece and not per-block level (in
libtorrent).
This means that torrents with pieces that contain multiple files may download
much more than just the single file that we want :/
Also, we may see progress on files that weren't even selected, for example if
the piece starts with them.
