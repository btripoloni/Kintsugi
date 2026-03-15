export interface LocalSourceOptions {
  path: string;
}

export interface LocalSourceResult {
  type: "local";
  path: string;
  toJSON(): LocalSourceResult;
}

export function LocalSource(options: LocalSourceOptions): LocalSourceResult {
  if (!options.path || options.path.trim() === "") {
    throw new Error("LocalSource: path is required");
  }

  if (options.path.includes("..")) {
    throw new Error("LocalSource: path must be relative to modlist root");
  }

  const result: LocalSourceResult = {
    type: "local",
    path: options.path,
    toJSON() {
      return {
        type: this.type,
        path: this.path,
      };
    },
  };

  return result;
}
