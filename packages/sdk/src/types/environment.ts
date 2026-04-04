export interface UmuConfig {
    /** Steam application ID (or umu game id); optional — umu-run may use umu-default. */
    id?: string;
    /** Proton / tool label for umu-run; optional when omitted from the CLI argv. */
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
