import type { Fetcher } from "@btripoloni/kintsugi";

export interface Recipe {
    out: string;
    src: Fetcher | any;
    dependencies?: string[];
}
