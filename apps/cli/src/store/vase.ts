import { join } from "jsr:@std/path";
import { copy } from "jsr:@std/fs";

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
): Promise<string> {
    const vasesDir = getVasesDir(root);
    await Deno.mkdir(vasesDir, { recursive: true });

    let counter = 1;
    let finalName = `${name}-${counter}`;

    // Auto increment version suffix, always starts at -1
    while (await vaseExists(root, finalName)) {
        counter++;
        finalName = `${name}-${counter}`;
    }

    const targetPath = join(vasesDir, finalName);

    // Copy ALL files directly from source path into the vase directory
    await copy(path, targetPath, { overwrite: true });

    return finalName;
}

export async function removeVase(root: string, name: string): Promise<void> {
    const vasePath = getVasePath(root, name);
    await Deno.remove(vasePath, { recursive: true });
}
