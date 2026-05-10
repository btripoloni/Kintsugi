export function getKintsugiRoot(customRoot?: string): string {
    if (customRoot) {
        return customRoot;
    }

    const envRoot = Deno.env.get("KINTSUGI_ROOT");
    if (envRoot) {
        return envRoot;
    }

    const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
    if (!home) {
        throw new Error("Could not determine home directory");
    }

    return join(home, ".kintsugi");
}

import { join } from "jsr:@std/path";
