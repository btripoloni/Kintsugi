import type { Fetcher } from "@btripoloni/kintsugi";

export interface Recipe {
    out: string;
    src: Fetcher | any;
    _dependencyHashes?: string[];
    postbuild?: string;
}
