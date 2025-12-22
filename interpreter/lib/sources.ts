import { Derivation, Source } from "./types.ts";
import { hashDerivation } from "./hash.ts";

export async function mkLocal(name: string, version: string, path: string): Promise<Derivation> {
    const src: Source = {
        source: "local",
        path,
    };

    return await hashDerivation({
        name,
        version,
        src,
    });
}

export async function mkUrl(
    name: string,
    version: string,
    url: string,
    sha256: string,
    unpack: boolean = false,
    run?: string
): Promise<Derivation> {
    const src: Source = {
        source: "url",
        url,
        sha256,
        unpack,
        run,
    };

    return await hashDerivation({
        name,
        version,
        src,
    });
}
