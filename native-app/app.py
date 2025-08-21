import sys
import json
import struct
import os
import select
import re
import qbittorrentapi
from functools import reduce
from enum import Enum


# Encode a message for transmission, given its content.
def encodeMessage(messageContent):
    # https://docs.python.org/3/library/json.html#basic-usage
    # To get the most compact JSON representation, you should specify
    # (',', ':') to eliminate whitespace.
    # We want the most compact representation because the browser rejects
    # messages that exceed 1 MB.
    encodedContent = json.dumps(
            messageContent,
            separators=(',', ':')).encode('utf-8')
    encodedLength = struct.pack('@I', len(encodedContent))
    return {'length': encodedLength, 'content': encodedContent}


# Send an encoded message to stdout
def sendMessage(encodedMessage):
    sys.stdout.buffer.write(encodedMessage['length'])
    sys.stdout.buffer.write(encodedMessage['content'])
    sys.stdout.buffer.flush()


def getMessage():
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        sys.exit(0)

    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode('utf-8')
    return json.loads(message)


client = qbittorrentapi.Client(host="qbittorrent.internal:80")
target_dir = "/home/simon/Downloads"
torrent_dir = "/mnt/indigo/mnt/torrent/downloads/aa-torrent-dl"
qbt_category = "aa-torrent-dl"


def add_torrent_paused(torrent_url):
    client.torrents_add(
        urls=torrent_url,
        is_paused=True,
        category=qbt_category)


priority = {
    "DoNotDownload": 0,
    "Normal": 1,
}


class QBTTorrent:
    def __init__(self, hash=None):
        assert hash
        self.hash = hash

    @classmethod
    def from_hash(cls, hash):
        return cls(hash=hash)

    def files(self):
        return client.torrents_files(self.hash)

    def set_file_prio(self, torrentfiles, prio):
        fileids = [file.index for file in torrentfiles]
        client.torrents_file_priority(self.hash, fileids, prio)

    def resume(self):
        client.torrents_resume(self.hash)

    def info(self):
        return client.torrents_info(torrent_hashes=self.hash)[0]

    def dl_dir(self):
        # match includes /, don't need to add one between path-parts.
        return torrent_dir + re.match(
                r".*(/[^/]+)$",
                self.info().content_path).group(1)


class TorrentState(Enum):
    Stopped = 1
    Downloading = 2
    Completed = 3


# not sure about the statuses here..
def get_torrents(state):
    filter = None
    match state:
        case TorrentState.Stopped:
            filter = lambda state_enum: state_enum.is_stopped  # noqa: E731
        case TorrentState.Downloading:
            filter = lambda state_enum: state_enum.is_downloading  # noqa: E731
        case TorrentState.Completed:
            filter = lambda state_enum: state_enum.is_complete  # noqa: E731

    assert filter
    return reduce(
        lambda list, info:
            list + ([QBTTorrent.from_hash(info.hash)]
                    if filter(info.state_enum) else []),
        client.torrents_info(category=qbt_category), [])


class TorrentFile:
    def __init__(self, torrent_name, filename, targetname):
        torrentname_variations = [torrent_name]
        # add variant without leading "r_", "f_", ..., if it exists.
        if re.match(r"^[a-z]_", torrent_name) is not None:
            torrentname_variations += [torrent_name[2:]]

        self.torrent_name_variations = torrentname_variations
        self.fname = filename
        self.targetname = targetname

    # torrentfile as retrieved via client.torrents_files.
    def matches(self, torrentfile):
        fname_variations = [tname + "/" + self.fname
                            for tname in self.torrent_name_variations]
        return torrentfile.name in fname_variations

    def store(self, torrentfile):
        src = torrent_dir + "/" + torrentfile.name
        dst = target_dir + "/" + self.targetname
        cmd = f"cp \"{src}\" \"{dst}\""
        os.system(cmd)


watch_torrentfiles = []


def notify_torrent_added(name):
    sendMessage(encodeMessage({
        "notification_type": "added",
        "name": name
    }))


def notify_torrent_downloading(name):
    sendMessage(encodeMessage({
        "notification_type": "downloading",
        "name": name
    }))


def notify_torrent_finished(name):
    sendMessage(encodeMessage({
        "notification_type": "finished",
        "name": name
    }))


def exec_command(command):
    if command["command"] == "download":
        torrent_link = command["torrent_link"]
        torrent_name = re.match(r".*/([^/]+)\.torrent$", torrent_link).group(1)

        torrent_target_file = command["torrent_target_file"]
        target_name = command["target_name"]
        sendMessage(encodeMessage(
            f"File {target_name} is added by torrent \
                {torrent_link} - {torrent_target_file}."))
        notify_torrent_added(target_name)
        add_torrent_paused(torrent_link)
        watch_torrentfiles.append(
            TorrentFile(torrent_name, torrent_target_file, target_name))


def enable_store_torrent_files(t):
    for f in t.files():
        for tf in watch_torrentfiles.copy():
            if tf.matches(f):
                if f.progress == 1:
                    sendMessage(encodeMessage(
                        f"File {tf.targetname} has finished downloading."))
                    notify_torrent_finished(tf.targetname)
                    tf.store(f)
                    watch_torrentfiles.remove(tf)
                elif f.priority == priority["DoNotDownload"]:
                    sendMessage(encodeMessage(
                        f"Starting download for file {tf.targetname}."))
                    notify_torrent_downloading(tf.targetname)
                    t.set_file_prio([f], priority["Normal"])
                else:
                    sendMessage(encodeMessage(
                        f"Progress of file {tf.targetname}: {f.progress:.2f}, \
                                progress of torrent {t.info().progress:.2f}"))


while True:
    r_rdy, _, _ = select.select([sys.stdin], [], [], 5.0)
    if len(r_rdy) > 0:
        exec_command(getMessage())

    for t in (
            get_torrents(TorrentState.Downloading) +
            get_torrents(TorrentState.Completed)):
        enable_store_torrent_files(t)

    for t in get_torrents(TorrentState.Stopped):
        t.set_file_prio(t.files(), priority["DoNotDownload"])
        enable_store_torrent_files(t)
        t.resume()
