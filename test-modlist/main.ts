import type { Source } from "kintsugi";

export default {
    name: "test-modlist",
    version: "1.0.0",
    src: {
        type: "url",
        url: "https://example.com/mod.zip",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
} as const;
