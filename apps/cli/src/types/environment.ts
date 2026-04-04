export interface UmuConfig {
    id?: string;
    version?: string;
}

export interface NativeEnvironment {
    type: "native";
}

export interface UmuEnvironment {
    type: "umu";
    id?: string;
    version?: string;
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
