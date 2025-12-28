{
  description = "Kintsugi Mod Manager Development Environment";

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
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            gopls
            gotools
            go-tools
            deno
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
