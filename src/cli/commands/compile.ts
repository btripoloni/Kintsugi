import { join } from "jsr:@std/path";
import { getKintsugiRoot } from "../../core/paths.ts";
import { readRecipeByName } from "../../compiler/src/store/store.ts";
import { executeLocal } from "../../compiler/src/sources/local.ts";
import { executeUrl } from "../../compiler/src/sources/url.ts";
import { executeComposition } from "../../compiler/src/sources/composition.ts";
import { executeVase } from "../../compiler/src/sources/vase.ts";
import type {
    Composition,
    Fetcher,
    FetchLocal,
    FetchUrl,
    FetchVase,
} from "../../compiler/src/types/fetchers.ts";

export interface CompileArgs {
    recipeName: string;
    store: string;
    modlist: string;
    output: string;
    root: string;
}

export function parseCompileArgs(args: string[] = Deno.args.slice(1)): CompileArgs {
    const recipeName = args[1];
    if (!recipeName) {
        console.error(
            "Usage: kintsugi compile <recipe-name> --store <store-dir> --modlist <modlist-dir> --output <output-dir> [--root <root-dir>]",
        );
        Deno.exit(1);
    }

    const storeIndex = args.indexOf("--store");
    const modlistIndex = args.indexOf("--modlist");
    const outputIndex = args.indexOf("--output");
    const rootIndex = args.indexOf("--root");

    const store = storeIndex !== -1 ? args[storeIndex + 1] : "store";
    const modlist = modlistIndex !== -1 ? args[modlistIndex + 1] : ".";
    const output = outputIndex !== -1 ? args[outputIndex + 1] : "output";
    const root = rootIndex !== -1 ? args[rootIndex + 1] : getKintsugiRoot();

    return {
        recipeName,
        store,
        modlist,
        output,
        root,
    };
}

async function executeSource(
    fetcher: Fetcher,
    modlistRoot: string,
    outputDir: string,
    root: string,
): Promise<void> {
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
        case "vase":
            await executeVase(fetcher as FetchVase, ctx, root);
            break;
        default:
            throw new Error(`Unknown source type: ${(fetcher as Fetcher).type}`);
    }
}

export async function compileCommand(compileArgs?: CompileArgs): Promise<void> {
    if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
        console.log(`
Kintsugi Compile

Usage:
  kintsugi compile <recipe-name> --store <store-dir> --modlist <modlist-dir> --output <output-dir> [--root <root-dir>]

Options:
  --store <dir>   Store directory (default: store)
  --modlist <dir> Modlist root directory (default: .)
  --output <dir>  Output directory (default: output)
  --root <dir>    Kintsugi root directory (default: ~/.kintsugi)
  --help, -h      Show this help message
`);
        return;
    }

    const args = compileArgs || parseCompileArgs();

    const recipe = await readRecipeByName(args.store, args.recipeName);

    if (!recipe) {
        console.error(`Error: recipe '${args.recipeName}' not found`);
        Deno.exit(1);
    }

    await Deno.mkdir(args.output, { recursive: true });

    await executeSource(recipe.src, args.modlist, args.output, args.root);

    console.log(`Compiled '${recipe.out}' to '${args.output}'`);
}
