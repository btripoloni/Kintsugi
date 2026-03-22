import { join } from "jsr:@std/path";
import type { Recipe } from "../types/recipe.ts";

const STORE_DIR = "store";

export function getRecipePath(hash: string, name: string, version: string): string {
  return join(STORE_DIR, "recipes", `${hash}-${name}-${version}.json`);
}

export async function recipeExists(hash: string, name: string, version: string): Promise<boolean> {
  const path = getRecipePath(hash, name, version);
  try {
    const info = await Deno.stat(path);
    return info.isFile;
  } catch {
    return false;
  }
}

export async function readRecipe(hash: string, name: string, version: string): Promise<Recipe | null> {
  const path = getRecipePath(hash, name, version);
  try {
    const content = await Deno.readFile(path);
    const text = new TextDecoder().decode(content);
    return JSON.parse(text) as Recipe;
  } catch {
    return null;
  }
}

export async function readRecipeByName(storeDir: string, recipeName: string): Promise<Recipe | null> {
  const path = join(storeDir, "recipes", `${recipeName}.json`);
  try {
    const content = await Deno.readFile(path);
    const text = new TextDecoder().decode(content);
    return JSON.parse(text) as Recipe;
  } catch {
    return null;
  }
}
