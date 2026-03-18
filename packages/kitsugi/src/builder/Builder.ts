import { Mod, ModOptions } from "../entities/Mod";
import { ModPack } from "../entities/ModPack";

export class Builder {
  private _modPack: ModPack | null = null;

  modPack(name: string, version?: string): Builder {
    this._modPack = new ModPack({ name, version });
    return this;
  }

  mod(options: ModOptions): Builder {
    if (!this._modPack) {
      throw new Error("Builder: must call .modPack() before .mod()");
    }
    const mod = new Mod(options);
    this._modPack.addMod(mod);
    return this;
  }

  withMods(mods: ModOptions[]): Builder {
    if (!this._modPack) {
      throw new Error("Builder: must call .modPack() before .withMods()");
    }
    for (const options of mods) {
      const mod = new Mod(options);
      this._modPack.addMod(mod);
    }
    return this;
  }

  build(): ModPack {
    if (!this._modPack) {
      throw new Error("Builder: must call .modPack() before .build()");
    }
    return this._modPack;
  }
}
