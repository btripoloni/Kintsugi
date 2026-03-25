import type { Fetcher } from "./fetchers.ts";

export interface Recipe {
    out: string;
    src: Fetcher;
    dependencies?: string[];
}
