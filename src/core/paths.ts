import { join } from "jsr:@std/path@1";

export function getKintsugiRoot(customRoot?: string): string {
    if (customRoot) {
        return customRoot;
    }

    const envRoot = Deno.env.get("KINTSUGI_ROOT");
    if (envRoot) {
        return envRoot;
    }

    const home = Deno.env.get("HOME");
    if (!home) {
        throw new Error("HOME environment variable is not set. Set KINTSUGI_ROOT or HOME.");
    }

    return join(home, ".kintsugi");
}