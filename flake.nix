{
  description = "Kintsugi Mod Manager";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages =
          let
            kintsugi = pkgs.stdenv.mkDerivation {
              pname = "kintsugi";
              version = "0.1.0";
              src = ./.;
              nativeBuildInputs = [ pkgs.deno ];
              buildPhase = ''
                deno compile -A -o $out ./src/cli/main.ts
              '';
              installPhase = ''
                mkdir -p $out
                mv kintsugi $out/
              '';
            };
          in
          {
            kintsugi = kintsugi;
            default = kintsugi;
          };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            deno
            fuse-overlayfs
            p7zip
          ];

          shellHook = ''
            echo "Kintsugi Dev Environment"
            echo "Deno: $(deno --version | head -n1)"
          '';
        };
      }
    );
}
