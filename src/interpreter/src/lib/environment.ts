import { join } from "jsr:@std/path";
import type { EnvironmentConfig, RunConfig, RunManifest } from "../types/environment.ts";

const ENV_FILE = "kintsugi/enviroment.json";
const RUN_FILE_EXTENSION = ".run.json";

export async function readEnvironmentConfig(modlistPath: string): Promise<EnvironmentConfig> {
    const envPath = join(modlistPath, ENV_FILE);

    try {
        const content = await Deno.readTextFile(envPath);
        const parsed = JSON.parse(content);

        if (parsed.type === "umu") {
            return {
                type: "umu",
                version: parsed.version,
                id: parsed.id,
            };
        }

        if (parsed.type === "native") {
            return { type: "native" };
        }

        throw new Error(`Invalid environment type: ${parsed.type}`);
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            return { type: "native" };
        }
        throw e;
    }
}

export async function readRunManifest(
    compositionPath: string,
    profile: string = "default",
): Promise<RunManifest> {
    const runPath = join(compositionPath, "kintsugi", "exec", `${profile}${RUN_FILE_EXTENSION}`);

    const content = await Deno.readTextFile(runPath);
    const parsed = JSON.parse(content);

    return {
        name: parsed.name ?? profile,
        entrypoint: parsed.entrypoint,
        args: parsed.args,
        env: parsed.env,
    };
}

export function getExecutionConfig(manifest: RunManifest, env: EnvironmentConfig): RunConfig {
    return {
        entrypoint: manifest.entrypoint,
        args: manifest.args,
        env: manifest.env,
    };
}
