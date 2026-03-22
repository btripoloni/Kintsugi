import { join } from "jsr:@std/path";
import { readRecipeByName } from "./store/store.ts";
import { executeLocal } from "./sources/local.ts";
import { executeUrl } from "./sources/url.ts";
import { executeComposition } from "./sources/composition.ts";
import type { FetchLocal, FetchUrl, Composition, Fetcher } from "./types/fetchers.ts";

interface CliArgs {
  command: string;
  recipeName: string;
  store: string;
  modlist: string;
  output: string;
}

function parseArgs(): CliArgs {
  const args = Deno.args;
  
  const commandIndex = args.indexOf("compile");
  if (commandIndex === -1) {
    console.error("Usage: kintsugi compile <recipe-name> --store <store-dir> --modlist <modlist-dir> --output <output-dir>");
    Deno.exit(1);
  }

  const recipeName = args[commandIndex + 1];
  if (!recipeName) {
    console.error("Error: recipe name is required");
    Deno.exit(1);
  }

  const storeIndex = args.indexOf("--store");
  const modlistIndex = args.indexOf("--modlist");
  const outputIndex = args.indexOf("--output");

  const store = storeIndex !== -1 ? args[storeIndex + 1] : "store";
  const modlist = modlistIndex !== -1 ? args[modlistIndex + 1] : ".";
  const output = outputIndex !== -1 ? args[outputIndex + 1] : "output";

  return {
    command: "compile",
    recipeName,
    store,
    modlist,
    output,
  };
}

async function executeSource(fetcher: Fetcher, modlistRoot: string, outputDir: string): Promise<void> {
  const ctx = { modlistRoot, outputDir };

  switch (fetcher.type) {
    case "local":
      await executeLocal(fetcher as FetchLocal, ctx);
      break;
    case "url":
      await executeUrl(fetcher as FetchUrl, ctx);
      break;
    case "composition":
      await executeComposition(fetcher as Composition, ctx);
      break;
    default:
      throw new Error(`Unknown source type: ${(fetcher as Fetcher).type}`);
  }
}

async function main() {
  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.log(`
Kintsugi Compiler

Usage:
  kintsugi compile <recipe-name> --store <store-dir> --modlist <modlist-dir> --output <output-dir>

Options:
  --store <dir>   Store directory (default: store)
  --modlist <dir> Modlist root directory (default: .)
  --output <dir>  Output directory (default: output)
  --help, -h      Show this help message
`);
    return;
  }

  const args = parseArgs();

  if (args.command === "compile") {
    const recipe = await readRecipeByName(args.store, args.recipeName);
    
    if (!recipe) {
      console.error(`Error: recipe '${args.recipeName}' not found`);
      Deno.exit(1);
    }

    await Deno.mkdir(args.output, { recursive: true });

    await executeSource(recipe.src, args.modlist, args.output);

    console.log(`Compiled '${recipe.out}' to '${args.output}'`);
  }
}

main();
