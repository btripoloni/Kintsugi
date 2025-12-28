import { mkVase, mkBuild, writeJson, writeText, mkLocal } from "kintsugi/mod.ts";

const myAssets = await mkVase({
    name: "my-assets",
    version: "1.0.0",
    vase: "my-assets-1"
});

const config = await writeJson({
    name: "mod-config",
    version: "1.0.0",
    path: "config.json",
    content: {
        resolution: "1920x1080",
        fullscreen: true
    }
});

const script = await writeText({
    name: "start-script",
    version: "1.0.0",
    path: "start.sh",
    content: "#!/bin/bash\necho 'Starting modpack...'\nls -R\n"
});

const localMod = await mkLocal({
    name: "local-mod",
    version: "1.0.0",
    path: "./local-src",
    exclude: ["ignore.txt"],
    postFetch: "echo 'Post-processing local mod'; touch processed.txt"
});

export default mkBuild({
    name: "test-modpack",
    layers: [myAssets, config, script, localMod],
    entrypoint: "sh start.sh"
});
