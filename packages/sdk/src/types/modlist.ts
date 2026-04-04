import type { EnvironmentConfig } from "./environment.ts";

export interface ModlistDefinition {
    name: string;
    version?: string;
    environment?: EnvironmentConfig;
}
