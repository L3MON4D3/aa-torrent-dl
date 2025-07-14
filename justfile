set dotenv-load

build_extension:
	web-ext sign -s extension/ --channel unlisted
	mkdir -p ./generated
	mv ./web-ext-artifacts/*.xpi ./generated/aa-torrent-dl@l3mon4.de.xpi

install_debug_native_app_json:
	#!/usr/bin/env bash
	script=$(nix build .#debug-app --print-out-paths)
	mkdir -p ./generated
	install -m755 "$script"/aa-torrent-native-dl ./generated/script
	sed -i "s#PLACEHOLDER#$(pwd)/native-app/app.py#" ./generated/script
	cp ./native-app/aa_torrent_dl_native.json ~/.mozilla/native-messaging-hosts/aa_torrent_dl_native.json
	sed -i "s#PLACEHOLDER#$(pwd)/generated/script#" ~/.mozilla/native-messaging-hosts/aa_torrent_dl_native.json

clean:
	rm ./generated/script
	rm ~/.mozilla/native-messaging-hosts/aa_torrent_dl_native.json
