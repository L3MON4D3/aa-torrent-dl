# Motivation

While the file-downloads on annas-archive.org work fine generally, sometimes
they take a while, or one has to resort to the links with timeout. That all is
fine for a free service, but since all data is also available in torrents,
it can also be retrieved this way (and, by seeding, support their
infrastructure).

# Usage

Navigate to the page for any file and simply click the extension-icon.  
If a download is found, there will be notifications about it being added,
starting, and finished, if no download is found (can be the case if there is no
bulk torrent download, or if that torrents is a tar-file and requires
extraction), there will also be a notification about that.

# State
Right now this is not really usable for anyone but me, paths and domains in
`native-app/app.py` are hardcoded for my setup.
