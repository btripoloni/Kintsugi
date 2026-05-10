import { join } from "jsr:@std/path";
import type { ModlistDefinition } from "@btripoloni/kintsugi";

export function getModlistsDir(root: string): string {
    return join(root, "modlists");
}

export function getModlistPath(root: string, name: string): string {
    return join(getModlistsDir(root), name);
}

export async function listModlists(root: string): Promise<string[]> {
    const modlistsDir = getModlistsDir(root);
    try {
        const entries = await Deno.readDir(modlistsDir);
        const modlists: string[] = [];
        for await (const entry of entries) {
            if (entry.isDirectory) {
                modlists.push(entry.name);
            }
        }
        return modlists;
    } catch {
        return [];
    }
}

export async function modlistExists(root: string, name: string): Promise<boolean> {
    const modlistPath = getModlistPath(root, name);
    try {
        const stat = await Deno.stat(modlistPath);
        return stat.isDirectory;
    } catch {
        return false;
    }
}

export async function removeModlist(root: string, name: string): Promise<void> {
    const modlistPath = getModlistPath(root, name);
    await Deno.remove(modlistPath, { recursive: true });
}

export async function getModlistInfo(root: string, name: string): Promise<ModlistDefinition | null> {
    const modlistJsonPath = join(getModlistPath(root, name), "modlist.json");
    try {
        const content = await Deno.readTextFile(modlistJsonPath);
        return JSON.parse(content) as ModlistDefinition;
    } catch {
        return null;
    }
}

export async function getActiveComposition(root: string, name: string): Promise<string | null> {
    const activePath = join(getModlistPath(root, name), "active");
    try {
        const target = await Deno.readLink(activePath);
        // Extract the composition name from the path (the last part)
        return target.split(/[\\/]/).pop() || target;
    } catch {
        return null;
    }
}

export interface BuildHistoryEntry {
    hash: string;
    timestamp: string;
}

export async function getBuildHistory(
    root: string,
    modlistName: string,
): Promise<BuildHistoryEntry[]> {
    const historyPath = join(getModlistPath(root, modlistName), "history.json");
    try {
        const content = await Deno.readTextFile(historyPath);
        return JSON.parse(content) as BuildHistoryEntry[];
    } catch {
        return [];
    }
}

export async function addBuildToHistory(
    root: string,
    modlistName: string,
    hash: string,
): Promise<void> {
    const history = await getBuildHistory(root, modlistName);

    // Don't add if the latest entry is the same hash
    if (history.length > 0 && history[history.length - 1].hash === hash) {
        return;
    }

    history.push({
        hash,
        timestamp: new Date().toISOString(),
    });

    const historyPath = join(getModlistPath(root, modlistName), "history.json");
    await Deno.writeTextFile(historyPath, JSON.stringify(history, null, 2));
}

export async function switchActiveBuild(
    root: string,
    modlistName: string,
    hash: string,
): Promise<void> {
    const modlistPath = getModlistPath(root, modlistName);
    const activePath = join(modlistPath, "active");
    const compositionPath = join(root, "store", hash);

    // Verify composition exists
    try {
        await Deno.stat(compositionPath);
    } catch {
        throw new Error(`Composition '${hash}' not found in store`);
    }

    try {
        await Deno.remove(activePath);
    } catch {
        // Ignore if doesn't exist
    }

    await Deno.symlink(compositionPath, activePath);
}
