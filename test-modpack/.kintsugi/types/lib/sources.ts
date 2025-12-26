import { Derivation, Source } from "./types.ts";
import { hashDerivation } from "./hash.ts";

interface LocalShard {
    name: string;
    version: string;
    path: string;
}

interface UrlShard {
    name: string;
    version: string;
    url: string;
    sha256: string;
    unpack: boolean;
    run?: string;
}

export async function mkLocal(shard: LocalShard): Promise<Derivation> {
    const contructed_shard: Omit<Derivation, "out"> = {
        name: shard.name,
        version: shard.version,
        src: {
            source: "local",
            path: shard.path,
        },
    };
    return await hashDerivation(contructed_shard);
}

export async function mkUrl(shard: UrlShard): Promise<Derivation> {
    const contructed_shard: Omit<Derivation, "out"> = {
        name: shard.name,
        version: shard.version,
        src: {
            source: "url",
            url: shard.url,
            sha256: shard.sha256,
            unpack: shard.unpack,
            run: shard.run,
        },
    };
    return hashDerivation(contructed_shard);
}

interface VaseShard {
    name: string;
    version: string;
    vase: string;
}

export async function mkVase(shard: VaseShard): Promise<Derivation> {
    const contructed_shard: Omit<Derivation, "out"> = {
        name: shard.name,
        version: shard.version,
        src: {
            source: "vase",
            vase: shard.vase,
        },
    };
    return await hashDerivation(contructed_shard);
}

// Function to generate a shard(derivation) this function will be used to make hi level functions like mkLocal and mkUrl
export async function makeShard(shard: Derivation){
    //turn await hashDerivation(shard);
}