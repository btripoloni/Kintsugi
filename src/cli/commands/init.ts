import { join } from "jsr:@std/path";

export interface InitArgs {
    name: string;
    force: boolean;
}

export function parseInitArgs(args: string[] = Deno.args.slice(1)): InitArgs {
    const force = args.includes("--force") || args.includes("-f");

    const filteredArgs = args.filter((arg) => arg !== "--force" && arg !== "-f");
    const name = filteredArgs[0];

    return { name, force };
}

export async function initCommand(initArgs?: InitArgs): Promise<void> {
    if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
        console.log(`
Kintsugi Init

Usage:
  kintsugi init [name] [--force]

Arguments:
  name         Modlist name (required)

Options:
  --force, -f  Overwrite existing files
  --help, -h   Show this help message
`);
        return;
    }

    const args = initArgs || parseInitArgs();
    const { name, force } = args;

    if (!name) {
        throw new Error("name is required. Usage: kintsugi init <name> [--force]");
    }

    const targetDir = join(Deno.cwd(), name);
    const denoJsonPath = join(targetDir, "deno.json");
    const mainTsPath = join(targetDir, "main.ts");

    try {
        await Deno.stat(targetDir);
        if (!force) {
            throw new Error(`Directory '${name}' already exists. Use --force to overwrite.`);
        }
    } catch (e) {
        if (!(e instanceof Deno.errors.NotFound)) {
            throw e;
        }
    }

    await Deno.mkdir(targetDir, { recursive: true });

    const denoJsonContent = JSON.stringify(
        {
            imports: {
                "kintsugi": "jsr:@btripoloni/kintsugi",
            },
        },
        null,
        4,
    );

    const mainTsContent = `import { Derivation } from "kintsugi";

export default {
    name: "${name}",
    version: "1.0.0",
    out: "./output",
    src: [],
} satisfies Derivation;
`;

    await Deno.writeTextFile(denoJsonPath, denoJsonContent);
    await Deno.writeTextFile(mainTsPath, mainTsContent);

    console.log(`Initialized kintsugi modlist '${name}' in ${targetDir}`);
}
