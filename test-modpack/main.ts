import { mkVase, mkBuild } from "kintsugi/mod.ts";

const myAssets = await mkVase({
    name: "my-assets",
    version: "1.0.0",
    vase: "my-assets-1"
});

export default mkBuild({
    name: "test-modpack",
    layers: [myAssets],
});
