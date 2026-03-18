import { Source, SourceOptions } from "./Source";

export interface ModOptions {
  id: string;
  name: string;
  version: string;
  source: Source;
}

export interface ModJSON {
  id: string;
  name: string;
  version: string;
  source: SourceOptions;
}

export class Mod {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly source: Source;

  constructor(options: ModOptions) {
    if (!options.id) {
      throw new Error("Mod: id is required");
    }
    if (!options.name) {
      throw new Error("Mod: name is required");
    }

    this.id = options.id;
    this.name = options.name;
    this.version = options.version;
    this.source = options.source;
  }

  toJSON(): ModJSON {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      source: this.source.toJSON(),
    };
  }
}
