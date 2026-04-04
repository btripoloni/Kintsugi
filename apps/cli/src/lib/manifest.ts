import { join } from "jsr:@std/path";
import type { EnvironmentConfig, RunManifest } from "../types/environment.ts";

export async function readEnvironmentConfig(modlistPath: string): Promise<EnvironmentConfig> {
    const modlistJsonPath = join(modlistPath, "modlist.json");
    try {
        const content = await Deno.readTextFile(modlistJsonPath);
        const modlist = JSON.parse(content);
        return modlist.environment || { type: "native" };
    } catch {
        return { type: "native" };
    }
}

export async function readRunManifest(
    compositionPath: string,
    profile: string,
): Promise<RunManifest> {
    const manifestPath = join(compositionPath, "kintsugi", "exec", `${profile}.run.json`);
    try {
        const content = await Deno.readTextFile(manifestPath);
        return JSON.parse(content) as RunManifest;
    } catch {
        return {
            name: profile,
            entrypoint: "/bin/sh",
            args: ["-c", "echo 'No run configured'"],
        };
    }
}
