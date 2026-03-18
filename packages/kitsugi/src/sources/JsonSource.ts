export interface JsonSourceOptions {
  path: string;
  content: any;
}

export interface JsonSourceResult {
  type: "json";
  path: string;
  content: any;
  toJSON(): { type: "json"; path: string; content: any };
}

export function JsonSource(options: JsonSourceOptions): JsonSourceResult {
  if (!options.path || options.path.trim() === "") {
    throw new Error("JsonSource: path is required");
  }

  if (options.content === undefined) {
    throw new Error("JsonSource: content is required");
  }

  const jsonOutput = {
    type: "json" as const,
    path: options.path,
    content: options.content,
  };

  return {
    type: "json",
    path: options.path,
    content: options.content,
    toJSON() {
      return jsonOutput;
    },
  };
}
