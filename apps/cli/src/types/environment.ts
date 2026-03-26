export interface UmuConfig {
    version: string;
    id: string;
}

export interface NativeEnvironment {
    type: "native";
}

export interface UmuEnvironment {
    type: "umu";
    version: string;
    id: string;
}

export type EnvironmentConfig = NativeEnvironment | UmuEnvironment;

export interface RunConfig {
    entrypoint: string;
    args?: string[];
    env?: Record<string, string>;
}

export interface RunManifest extends RunConfig {
    name: string;
}