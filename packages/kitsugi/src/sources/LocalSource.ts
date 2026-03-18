export interface LocalSourceOptions {
  path: string;
}

export interface LocalSourceResult {
  type: "local";
  path: string;
  toJSON(): { type: "local"; path: string };
}

export function LocalSource(options: LocalSourceOptions): LocalSourceResult {
  if (!options.path || options.path.trim() === "") {
    throw new Error("LocalSource: path is required");
  }

  if (options.path.includes("..")) {
    throw new Error("LocalSource: path must be relative to modlist root");
  }

  const jsonOutput = {
    type: "local" as const,
    path: options.path,
  };

  return {
    type: "local",
    path: options.path,
    toJSON() {
      return jsonOutput;
    },
  };
}
