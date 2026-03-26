import { join } from "jsr:@std/path";
import type { EnvironmentConfig, RunManifest } from "../types/environment.ts";

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
  umuConfig: { version: string; id: string },
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<void> {
  const proc = new Deno.Command("umu-run", {
    args: [
      umuConfig.id,
      umuConfig.version,
      entrypoint,
      ...args,
    ],
    cwd: mergedPath,
    env: {
      ...Deno.env.toObject(),
      ...env,
      KINTSUGI_ROOT: mergedPath,
      WINEPREFIX: join(mergedPath, "..", "prefix"),
    },
  });

  const output = await proc.output();
  if (!output.success) {
    const error = new TextDecoder().decode(output.stderr);
    throw new Error(`UMU execution failed: ${error}`);
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
