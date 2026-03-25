import { join } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs";
import type { Recipe } from "../types/recipe.ts";

export function getRecipePath(storeDir: string, out: string): string {
    return join(storeDir, "recipes", `${out}.json`);
}

export async function recipeExists(storeDir: string, out: string): Promise<boolean> {
    const path = getRecipePath(storeDir, out);
    try {
        const info = await Deno.stat(path);
        return info.isFile;
    } catch {
        return false;
    }
}

export async function readRecipe(storeDir: string, out: string): Promise<Recipe | null> {
    const path = getRecipePath(storeDir, out);
    try {
        const content = await Deno.readFile(path);
        const text = new TextDecoder().decode(content);
        return JSON.parse(text) as Recipe;
    } catch {
        return null;
    }
}

export async function saveRecipe(storeDir: string, out: string, recipe: Recipe): Promise<void> {
    const path = getRecipePath(storeDir, out);
    const dir = join(storeDir, "recipes");
    await ensureDir(dir);
    await Deno.writeTextFile(path, JSON.stringify(recipe, null, 2));
}

export async function readRecipeByName(
    storeDir: string,
    recipeName: string,
): Promise<Recipe | null> {
    const path = join(storeDir, "recipes", `${recipeName}.json`);
    try {
        const content = await Deno.readFile(path);
        const text = new TextDecoder().decode(content);
        return JSON.parse(text) as Recipe;
    } catch {
        return null;
    }
}
