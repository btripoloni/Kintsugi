import { join } from "jsr:@std/path";
import type { EnvironmentConfig, RunManifest } from "@btripoloni/kintsugi";

export interface ExecutorOptions {
    compositionPath: string;
    modlistPath: string;
    envConfig: EnvironmentConfig;
    manifest: RunManifest;
}

interface OverlayDirs {
    upper: string;
    work: string;
    merged: string;
}

async function setupOverlayDirs(modlistPath: string): Promise<OverlayDirs> {
    const upper = join(modlistPath, "upperlayer");
    const work = join(modlistPath, "worklayer");
    const merged = join(modlistPath, "merged");

    await Deno.mkdir(upper, { recursive: true });
    await Deno.mkdir(work, { recursive: true });
    await Deno.mkdir(merged, { recursive: true });

    return { upper, work, merged };
}

async function mountOverlay(
    lower: string,
    upper: string,
    work: string,
    merged: string,
): Promise<void> {
    const proc = new Deno.Command("fuse-overlayfs", {
        args: [
            "-o",
            `lowerdir=${lower},upperdir=${upper},workdir=${work}`,
            merged,
        ],
    });

    const output = await proc.output();
    if (!output.success) {
        const error = new TextDecoder().decode(output.stderr);
        throw new Error(`Failed to mount overlayfs: ${error}`);
    }
}

async function unmountOverlay(merged: string): Promise<void> {
    try {
        const proc = new Deno.Command("fusermount", {
            args: ["-u", merged],
        });
        await proc.output();
    } catch {
        try {
            const proc = new Deno.Command("umount", {
                args: [merged],
            });
            await proc.output();
        } catch {
            // Ignore unmount errors
        }
    }
}

async function executeNative(
    mergedPath: string,
    entrypoint: string,
    args: string[] = [],
    env: Record<string, string> = {},
): Promise<void> {
    const fullPath = join(mergedPath, entrypoint);
    const cwd = mergedPath;

    const proc = new Deno.Command(fullPath, {
        args,
        cwd,
        env: {
            ...Deno.env.toObject(),
            ...env,
            KINTSUGI_ROOT: mergedPath,
        },
    });

    const output = await proc.output();
    if (!output.success) {
        const error = new TextDecoder().decode(output.stderr);
        throw new Error(`Execution failed: ${error}`);
    }
}

async function executeUmu(
    mergedPath: string,
    entrypoint: string,
    umuConfig: { version?: string; id?: string },
    args: string[] = [],
    env: Record<string, string> = {},
): Promise<void> {
    const exePath = entrypoint.startsWith("/") ? entrypoint : join(mergedPath, entrypoint);
    try {
        await Deno.stat(exePath);
    } catch {
        throw new Error(
            `Executable not found in the merged overlay at ${exePath}. ` +
                "Check write_run entrypoint and ensure the game (vase) layer is in the composition.",
        );
    }

    let launchExe = exePath;
    try {
        launchExe = await Deno.realPath(exePath);
    } catch {
        // fuse-overlayfs or odd layouts: keep exePath
    }

    const winePrefix = join(mergedPath, "..", "prefix");
    const umuId = typeof umuConfig.id === "string" ? umuConfig.id.trim() : "";
    const umuVersion = typeof umuConfig.version === "string" ? umuConfig.version.trim() : "";

    const umuEnv: Record<string, string> = {
        ...Deno.env.toObject(),
        ...env,
        KINTSUGI_ROOT: mergedPath,
        WINEPREFIX: winePrefix,
        STEAM_COMPAT_DATA_PATH: winePrefix,
    };
    if (umuId) {
        umuEnv.GAMEID = umuId;
    }

    const umuArgs = umuId !== "" && umuVersion !== ""
        ? [umuId, umuVersion, launchExe, ...args]
        : [launchExe, ...args];

    const proc = new Deno.Command("umu-run", {
        args: umuArgs,
        cwd: mergedPath,
        env: umuEnv,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
    });

    const child = proc.spawn();
    const status = await child.status;
    if (!status.success) {
        throw new Error(`umu-run exited with code ${status.code}`);
    }
}

export async function executeWithOverlay(options: ExecutorOptions): Promise<void> {
    const { compositionPath, modlistPath, envConfig, manifest } = options;

    const dirs = await setupOverlayDirs(modlistPath);

    try {
        await mountOverlay(compositionPath, dirs.upper, dirs.work, dirs.merged);

        if (envConfig.type === "umu") {
            await executeUmu(
                dirs.merged,
                manifest.entrypoint,
                { version: envConfig.version, id: envConfig.id },
                manifest.args,
                manifest.env,
            );
        } else {
            await executeNative(
                dirs.merged,
                manifest.entrypoint,
                manifest.args,
                manifest.env,
            );
        }
    } finally {
        await unmountOverlay(dirs.merged);
    }
}
