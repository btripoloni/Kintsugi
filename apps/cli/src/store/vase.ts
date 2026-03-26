import { join } from "jsr:@std/path";

export interface VaseMetadata {
    name: string;
    path: string;
    addedAt: string;
    game?: string;
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
        return vases;
    } catch {
        return [];
    }
}

export async function vaseExists(root: string, name: string): Promise<boolean> {
    const vasePath = getVasePath(root, name);
    try {
        const stat = await Deno.stat(vasePath);
        return stat.isDirectory;
    } catch {
        return false;
    }
}

export async function addVase(
    root: string,
    name: string,
    path: string,
    game?: string,
): Promise<void> {
    const vasesDir = getVasesDir(root);
    await Deno.mkdir(vasesDir, { recursive: true });

    const targetPath = join(vasesDir, name);
    await Deno.mkdir(targetPath, { recursive: true });

    const metadata: VaseMetadata = {
        name,
        path,
        addedAt: new Date().toISOString(),
        game,
    };

    const metadataPath = join(targetPath, "metadata.json");
    await Deno.writeTextFile(metadataPath, JSON.stringify(metadata, null, 2));
}

export async function removeVase(root: string, name: string): Promise<void> {
    const vasePath = getVasePath(root, name);
    await Deno.remove(vasePath, { recursive: true });
}

export async function getVaseMetadata(root: string, name: string): Promise<VaseMetadata | null> {
    const vasePath = getVasePath(root, name);
    const metadataPath = join(vasePath, "metadata.json");

    try {
        const content = await Deno.readTextFile(metadataPath);
        return JSON.parse(content) as VaseMetadata;
    } catch {
        return null;
    }
}