import { mkLocal, mkUrl, mkBuild } from "kintsugi/mod.ts";

// Define your modpack here
const game = await mkLocal("game", "1.0.0", "/path/to/game");

export default mkBuild({
    name: "demo-modpack",
    layers: [game],
    // version: "0.0.1"
});
