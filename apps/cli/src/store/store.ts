import { join } from "jsr:@std/path";
import type { Recipe } from "../lib/recipe.ts";

export function getRecipePath(storeDir: string, out: string): string {
    return join(storeDir, "recipes", `${out}.json`);
}

export async function recipeExists(storeDir: string, out: string): Promise<boolean> {
    const path = getRecipePath(storeDir, out);
    try {
        await Deno.stat(path);
        return true;
    } catch {
        return false;
    }
}

export async function readRecipe(storeDir: string, out: string): Promise<Recipe | null> {
    const path = getRecipePath(storeDir, out);
    try {
        const content = await Deno.readTextFile(path);
        return JSON.parse(content) as Recipe;
    } catch {
        return null;
    }
}

export async function saveRecipe(storeDir: string, out: string, recipe: Recipe): Promise<void> {
    const path = getRecipePath(storeDir, out);
    const dir = join(storeDir, "recipes");
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify(recipe, null, 2));
}

export async function readRecipeByName(
    storeDir: string,
    name: string,
): Promise<Recipe | null> {
    const recipesDir = join(storeDir, "recipes");
    try {
        for await (const entry of Deno.readDir(recipesDir)) {
            if (!entry.isFile || !entry.name.endsWith(".json")) continue;
            const path = join(recipesDir, entry.name);
            const content = await Deno.readTextFile(path);
            const recipe = JSON.parse(content) as Recipe;
            if (recipe.out.startsWith(name) || recipe.out.includes(name)) {
                return recipe;
            }
        }
    } catch {
        // Ignore errors
    }
    return null;
}