export interface VaseSourceOptions {
  vase: string;
}

export interface VaseSourceResult {
  type: "vase";
  vase: string;
  toJSON(): { type: "vase"; vase: string };
}

function isValidVaseName(name: string): boolean {
  return /^[a-z0-9_-]+$/.test(name);
}

export function VaseSource(options: VaseSourceOptions): VaseSourceResult {
  if (!options.vase || options.vase.trim() === "") {
    throw new Error("VaseSource: vase is required");
  }

  if (!isValidVaseName(options.vase)) {
    throw new Error("VaseSource: vase must contain only lowercase letters, numbers, hyphens, and underscores");
  }

  const jsonOutput = {
    type: "vase" as const,
    vase: options.vase,
  };

  return {
    type: "vase",
    vase: options.vase,
    toJSON() {
      return jsonOutput;
    },
  };
}
