{
  description = "Empty nix flake.";

  inputs = {
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, flake-utils, ... }@inputs : flake-utils.lib.eachDefaultSystem(system: let
    pkgs = import inputs.nixpkgs-unstable { inherit system; };
    python_libs = pp: with pp; [pp.qbittorrent-api pp.python-slugify];
  in {
    packages = let
      native_script = pkgs.writers.writePython3Bin
        "aa-torrent-dl-native"
        {libraries = python_libs pkgs.python3Packages;}
        (builtins.readFile ./native-app/app.py);
      manifest = builtins.fromJSON (builtins.readFile ./extension/manifest.json);
    in {
      extension = pkgs.stdenv.mkDerivation {
        pname = "aa-torrent-dl";
        version = manifest.version;
        src = ./generated;
        phases = ["unpackPhase" "installPhase"];
        installPhase = ''
          # fixed string from home-manager.
          dst="$out/share/mozilla/extensions/{ec8030f7-c20a-464f-9b0e-13a3a9e97384}"
          install -DT "$src/aa-torrent-dl@l3mon4.de.xpi" "$dst/aa-torrent-dl@l3mon4.de.xpi"
        '';
      };
      debug-app = pkgs.stdenv.mkDerivation {
        name = "debug-app";
        phases = ["installPhase"];
        installPhase = ''
          install -d "$out"
          printf "#!/usr/bin/env bash\n${pkgs.python3.withPackages python_libs}/bin/python PLACEHOLDER" > "$out"/aa-torrent-native-dl
        '';
      };
      native-app = pkgs.stdenv.mkDerivation {
        pname = "aa-torrent-dl-host";
        version = "0.0.2";

        src = ./native-app;

        installPhase = ''
          substituteInPlace aa_torrent_dl_native.json \
            --replace PLACEHOLDER ${native_script}/bin/aa-torrent-dl-native

          install -Dt $out/lib/mozilla/native-messaging-hosts aa_torrent_dl_native.json

          # sed -i 's#PLACEHOLDER#${native_script}/bin/a#' "$src/manifest.json"
          # install -d "$out/lib/mozilla/native-messaging-hosts"
          # ln -s "$src/manifest.json" "$out/lib/mozilla/native-messaging-hosts"
        '';
      };
    }; 
    devShells.default = pkgs.mkShell {
      packages = with pkgs; [
        web-ext
        just
      ];
    };
  });
}
