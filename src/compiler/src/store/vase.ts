import { join } from "jsr:@std/path";

export interface VaseMetadata {
    name: string;
    createdAt: string;
    sourcePath: string;
}

export function getVasesDir(root: string): string {
    return join(root, "vases");
}

export function getVasePath(root: string, name: string): string {
    return join(getVasesDir(root), name);
}

export async function listVases(root: string): Promise<string[]> {
    const vasesDir = getVasesDir(root);
    try {
        const entries = await Deno.readDir(vasesDir);
        const vases: string[] = [];
        for await (const entry of entries) {
            if (entry.isDirectory) {
                vases.push(entry.name);
            }
        }
        return vases.sort();
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            return [];
        }
        throw err;
    }
}

export async function vaseExists(root: string, name: string): Promise<boolean> {
    const vasePath = getVasePath(root, name);
    try {
        const info = await Deno.stat(vasePath);
        return info.isDirectory;
    } catch {
        return false;
    }
}

function getNextSuffix(root: string, baseName: string): Promise<number> {
    return listVases(root).then((vases) => {
        let maxSuffix = 0;
        const prefix = `${baseName}-`;
        for (const vase of vases) {
            if (vase.startsWith(prefix)) {
                const suffix = parseInt(vase.slice(prefix.length), 10);
                if (!isNaN(suffix) && suffix > maxSuffix) {
                    maxSuffix = suffix;
                }
            }
        }
        return maxSuffix + 1;
    });
}

export async function addVase(
    root: string,
    baseName: string,
    sourcePath: string,
): Promise<string> {
    const vasesDir = getVasesDir(root);
    await Deno.mkdir(vasesDir, { recursive: true });

    const suffix = await getNextSuffix(root, baseName);
    const vaseName = `${baseName}-${suffix}`;
    const vasePath = getVasePath(root, vaseName);

    await Deno.mkdir(vasePath, { recursive: true });

    await copyDirAsLinks(sourcePath, vasePath);

    const metadata: VaseMetadata = {
        name: vaseName,
        createdAt: new Date().toISOString(),
        sourcePath: sourcePath,
    };

    await Deno.writeTextFile(
        join(vasePath, ".kintsugi-vase.json"),
        JSON.stringify(metadata, null, 2),
    );

    return vaseName;
}

async function copyDirAsLinks(srcDir: string, destDir: string): Promise<void> {
    await Deno.mkdir(destDir, { recursive: true });

    const entries = await Deno.readDir(srcDir);

    for await (const entry of entries) {
        const srcPath = join(srcDir, entry.name);
        const destPath = join(destDir, entry.name);

        if (entry.isFile) {
            try {
                await Deno.link(srcPath, destPath);
            } catch (err) {
                if (err instanceof Deno.errors.AlreadyExists) {
                    await Deno.remove(destPath);
                    await Deno.link(srcPath, destPath);
                } else {
                    throw err;
                }
            }
        } else if (entry.isDirectory) {
            await copyDirAsLinks(srcPath, destPath);
        }
    }
}

export async function removeVase(root: string, name: string): Promise<void> {
    const vasePath = getVasePath(root, name);
    await Deno.remove(vasePath, { recursive: true });
}

export async function getVaseMetadata(
    root: string,
    name: string,
): Promise<VaseMetadata | null> {
    const metadataPath = join(getVasePath(root, name), ".kintsugi-vase.json");
    try {
        const content = await Deno.readTextFile(metadataPath);
        return JSON.parse(content) as VaseMetadata;
    } catch {
        return null;
    }
}
