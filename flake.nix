{
  description = "Kintsugi Mod Manager";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages = let
          kintsugi = pkgs.buildGoModule {
            pname = "kintsugi";
            version = "0.1.0";
            src = ./.;
            vendorHash = "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="; # Update with actual hash from build
            subPackages = [ "cmd/kintsugi" ];
            propagatedBuildInputs = [ pkgs.deno ];
          };
          kintsugi-compiler = pkgs.buildGoModule {
            pname = "kintsugi-compiler";
            version = "0.1.0";
            src = ./.;
            vendorHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; # Placeholder, update after first build
            subPackages = [ "cmd/kintsugi-compiler" ];
            propagatedBuildInputs = [ pkgs.deno ];
          };
        in {
          kintsugi = kintsugi;
          kintsugi-compiler = kintsugi-compiler;
          default = pkgs.symlinkJoin {
            name = "kintsugi-full";
            paths = [ kintsugi kintsugi-compiler ];
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            gopls
            gotools
            go-tools
            deno
            fuse-overlayfs
          ];

          shellHook = ''
            echo "Kintsugi Dev Environment"
            echo "Go: $(go version)"
            echo "Deno: $(deno --version | head -n1)"
            export CGO_ENABLED=1
          '';
        };
      }
    );
}
