import { Mod, ModJSON } from "./Mod";

export interface ModPackOptions {
  name: string;
  version?: string;
  mods?: Mod[];
  metadata?: Record<string, any>;
}

export interface ModPackJSON {
  name: string;
  version?: string;
  mods: ModJSON[];
  metadata?: Record<string, any>;
}

export class ModPack {
  readonly name: string;
  readonly version?: string;
  readonly metadata?: Record<string, any>;
  private _mods: Mod[];

  constructor(options: ModPackOptions) {
    if (!options.name) {
      throw new Error("ModPack: name is required");
    }

    this.name = options.name;
    this.version = options.version;
    this.metadata = options.metadata;
    this._mods = options.mods || [];
  }

  get mods(): Mod[] {
    return this._mods;
  }

  addMod(mod: Mod): void {
    this._mods.push(mod);
  }

  toJSON(): ModPackJSON {
    return {
      name: this.name,
      version: this.version,
      mods: this._mods.map((mod) => mod.toJSON()),
      metadata: this.metadata,
    };
  }
}
