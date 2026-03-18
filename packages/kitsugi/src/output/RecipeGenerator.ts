import { ModPack } from "../entities/ModPack";

export interface Recipe {
  name: string;
  version?: string;
  mods: Array<{
    id: string;
    name: string;
    version: string;
    source: any;
  }>;
}

export function generateRecipe(modPack: ModPack): Recipe {
  return {
    name: modPack.name,
    version: modPack.version,
    mods: modPack.mods.map((mod) => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      source: mod.source.toJSON(),
    })),
  };
}
