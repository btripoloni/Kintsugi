import { mkLocal, mkUrl, mkBuild } from "kintsugi/mod.ts";

// Define your modpack here
const game = await mkLocal({
    name: "game",
    version: "1.0.0",
    path: "/path/to/game"
});

export default mkBuild({
    name: "demo-fixed",
    layers: [game],
    // version: "0.0.1"
});
