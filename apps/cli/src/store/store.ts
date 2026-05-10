import { join } from "jsr:@std/path";
import type { Recipe } from "@btripoloni/kintsugi";

export function getRecipePath(recipesDir: string, out: string): string {
    return join(recipesDir, `${out}.json`);
}

export async function recipeExists(recipesDir: string, out: string): Promise<boolean> {
    const path = getRecipePath(recipesDir, out);
    try {
        await Deno.stat(path);
        return true;
    } catch {
        return false;
    }
}

export async function readRecipe(recipesDir: string, out: string): Promise<Recipe | null> {
    const path = getRecipePath(recipesDir, out);
    try {
        const content = await Deno.readTextFile(path);
        return JSON.parse(content) as Recipe;
    } catch {
        return null;
    }
}

export async function saveRecipe(recipesDir: string, out: string, recipe: Recipe): Promise<void> {
    const path = getRecipePath(recipesDir, out);
    await Deno.mkdir(recipesDir, { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify(recipe, null, 2));
}

export async function readRecipeByName(
    recipesDir: string,
    name: string,
): Promise<Recipe | null> {
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
