import { BuildOptions, Derivation, Source } from "./types.ts";
import { hashDerivation } from "./hash.ts";

export async function mkBuild(options: BuildOptions): Promise<Derivation> {
    const { name, layers, entrypoint, umu, args, env, permissions, postbuild } = options;
    //const version = "1.0.0";

    const dependencyHashes = layers.map(l => l.out);

    const src: Source = {
        source: "build",
        layers: dependencyHashes,
        entrypoint,
        umu,
        args,
        env,
        permissions,
    };

    // Construct the object to hash
    const drv = await hashDerivation({
        name,
        version: "generated", // or explicit
        src,
        dependencies: dependencyHashes,
        permissions,
        postbuild
        // postbuild is separate? No, 'postbuild' is top level in json example?
        // checking design: "postbuild": "" //shell script
        // So it should be in the Derivation object?
        // My Derivation interface didn't have postbuild. I should add it?
        // Design 2.4 says postbuild is at top level of json.
    });

    // If postbuild exists, add it (and it should have been hashed if it affects output)
    // My hashDerivation takes ...rest, so if I pass it, it gets hashed.
    // I need to update Derivation interface to include postbuild if needed.

    return drv;
}
