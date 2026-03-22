import { join } from "jsr:@std/path";
import { readEnvironmentConfig, readRunManifest } from "../../interpreter/src/lib/environment.ts";
import { executeWithOverlay } from "../../core/executor/executor.ts";

export interface RunArgs {
  modlist: string;
  profile: string;
  kintsugiRoot: string;
}

export function parseRunArgs(args: string[] = Deno.args.slice(1)): RunArgs {
  const modlist = args[1];
  const profile = args[2] || "default";

  const rootIndex = args.indexOf("--root");
  const kintsugiRoot = rootIndex !== -1 ? args[rootIndex + 1] : Deno.env.get("KINTSUGI_ROOT") || ".kintsugi";

  if (!modlist) {
    console.error("Usage: kintsugi run <modlist-name> [profile] [--root <kintsugi-root>]");
    Deno.exit(1);
  }

  return { modlist, profile, kintsugiRoot };
}

export async function runModlist(args: RunArgs): Promise<void> {
  const modlistPath = join(args.kintsugiRoot, "modlists", args.modlist);
  const activePath = join(modlistPath, "active");

  let compositionPath: string;
  try {
    const activeTarget = await Deno.readLink(activePath);
    compositionPath = activeTarget;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(`Modlist '${args.modlist}' has no active composition. Run 'kintsugi switch ${args.modlist}' first.`);
    }
    throw e;
  }

  const envConfig = await readEnvironmentConfig(modlistPath);
  const manifest = await readRunManifest(compositionPath, args.profile);

  console.log(`Running modlist '${args.modlist}' with profile '${args.profile}'`);
  console.log(`Environment: ${envConfig.type}`);
  console.log(`Entrypoint: ${manifest.entrypoint}`);

  await executeWithOverlay({
    compositionPath,
    modlistPath,
    envConfig,
    manifest,
  });
}

export async function runCommand(): Promise<void> {
  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.log(`
Kintsugi Run

Usage:
  kintsugi run <modlist-name> [profile] [--root <kintsugi-root>]

Arguments:
  modlist-name     Name of the modlist to run
  profile          Execution profile (default: default)
  --root           Kintsugi root directory (default: .kintsugi)
  --help, -h       Show this help message

Examples:
  kintsugi run skyrim default
  kintsugi run skyrim editor
  kintsugi run skyrim --root ~/.kintsugi
`);
    return;
  }

  const args = parseRunArgs();
  await runModlist(args);
}
