import { assertEquals } from "jsr:@std/assert";
import type { FetchLocal, FetchUrl, FetchVase, WriteJson, WriteRun } from "../types/fetchers.ts";
import { json, local, run, url, vase } from "./modpack.ts";

Deno.test("Shard helpers", async (t) => {
    await t.step("url() creates valid url shard", () => {
        const shard = url({
            name: "test-mod",
            version: "1.0.0",
            url: "https://example.com/file.zip",
            sha256: "abc123",
            unpack: true,
        });

        assertEquals(shard.name, "test-mod");
        assertEquals(shard.version, "1.0.0");
        assertEquals(shard.src.type, "url");
        const src = shard.src as FetchUrl;
        assertEquals(src.url, "https://example.com/file.zip");
        assertEquals(src.sha256, "abc123");
        assertEquals(src.unpack, true);
    });

    await t.step("local() creates valid local shard", () => {
        const shard = local({
            name: "local-mod",
            version: "1.0.0",
            path: "./mods/test",
        });

        assertEquals(shard.src.type, "local");
        const src = shard.src as FetchLocal;
        assertEquals(src.path, "./mods/test");
    });

    await t.step("json() creates valid write_json shard", () => {
        const shard = json({
            name: "config-file",
            version: "1.0.0",
            path: "config.json",
            content: { enabled: true },
        });

        assertEquals(shard.src.type, "write_json");
        const src = shard.src as WriteJson;
        assertEquals(src.path, "config.json");
        assertEquals(src.content, { enabled: true });
    });

    await t.step("run() creates valid write_run shard", () => {
        const shard = run({
            name: "launch-profile",
            version: "1.0.0",
            profile: "default",
            entrypoint: "game.exe",
            args: ["--windowed"],
        });

        assertEquals(shard.src.type, "write_run");
        const src = shard.src as WriteRun;
        assertEquals(src.profile, "default");
        assertEquals(src.entrypoint, "game.exe");
        assertEquals(src.args, ["--windowed"]);
    });

    await t.step("vase() creates valid vase shard", () => {
        const shard = vase({
            name: "skyrim-base",
            version: "1.6.1170",
            vase: "skyrim-se-1.6.1170",
        });

        assertEquals(shard.src.type, "vase");
        const src = shard.src as FetchVase;
        assertEquals(src.vase, "skyrim-se-1.6.1170");
    });

    await t.step("all helpers accept dependencies and postbuild", () => {
        const dep = local({ name: "dep", version: "1.0.0", path: "dep" });

        const shard = url({
            name: "test",
            version: "1.0.0",
            url: "https://example.com/file.zip",
            sha256: "abc123",
            dependencies: [dep],
            postbuild: "chmod +x binary",
        });

        assertEquals(shard.dependencies?.length, 1);
        assertEquals(shard.postbuild, "chmod +x binary");
    });
});
