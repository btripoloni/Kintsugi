export type SourceType = "json" | "local" | "url" | "vase";

export interface SourceOptions {
  type: SourceType;
  url?: string;
  path?: string;
  content?: any;
  vase?: string;
  sha256?: string;
}

export interface Source {
  type: SourceType;
  url?: string;
  path?: string;
  content?: any;
  vase?: string;
  sha256?: string;
  toJSON(): SourceOptions;
}

const VALID_TYPES: SourceType[] = ["json", "local", "url", "vase"];

export function createSource(options: SourceOptions): Source {
  if (!VALID_TYPES.includes(options.type)) {
    throw new Error(`Source: type must be one of ${VALID_TYPES.join(", ")}`);
  }

  switch (options.type) {
    case "json":
      if (!options.path) throw new Error("Source: path is required for json type");
      if (options.content === undefined) throw new Error("Source: content is required for json type");
      break;
    case "local":
      if (!options.path) throw new Error("Source: path is required for local type");
      break;
    case "url":
      if (!options.url) throw new Error("Source: url is required for url type");
      if (!options.sha256) throw new Error("Source: sha256 is required for url type");
      break;
    case "vase":
      if (!options.vase) throw new Error("Source: vase is required for vase type");
      break;
  }

  return {
    type: options.type,
    url: options.url,
    path: options.path,
    content: options.content,
    vase: options.vase,
    sha256: options.sha256,
    toJSON() {
      return {
        type: this.type,
        url: this.url,
        path: this.path,
        content: this.content,
        vase: this.vase,
        sha256: this.sha256,
      };
    },
  };
}
