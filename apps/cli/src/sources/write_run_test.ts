import { join } from "jsr:@std/path";
import { assertEquals } from "jsr:@std/assert";
import { executeRun } from "./write_run.ts";
import type { WriteRun } from "../../../../packages/sdk/src/types/fetchers.ts";

Deno.test("executeRun creates manifest file", async (t) => {
    const tmpDir = await Deno.makeTempDir();

    const fetcher: WriteRun = {
        type: "write_run",
        profile: "game",
        entrypoint: "/usr/bin/game",
        args: ["--start"],
        env: { GAME_DIR: "/opt/game" },
    };

    const ctx = {
        modlistRoot: "/fake/modlist",
        outputDir: tmpDir,
    };

    await executeRun(fetcher, ctx);

    const manifestPath = join(tmpDir, "kintsugi", "exec", "game.run.json");
    const content = await Deno.readTextFile(manifestPath);
    const manifest = JSON.parse(content);

    assertEquals(manifest.entrypoint, "/usr/bin/game");
    assertEquals(manifest.args, ["--start"]);
    assertEquals(manifest.env, { GAME_DIR: "/opt/game" });

    await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("executeRun handles optional fields", async (t) => {
    const tmpDir = await Deno.makeTempDir();

    const fetcher: WriteRun = {
        type: "write_run",
        profile: "editor",
        entrypoint: "/usr/bin/editor",
    };

    const ctx = {
        modlistRoot: "/fake/modlist",
        outputDir: tmpDir,
    };

    await executeRun(fetcher, ctx);

    const manifestPath = join(tmpDir, "kintsugi", "exec", "editor.run.json");
    const content = await Deno.readTextFile(manifestPath);
    const manifest = JSON.parse(content);

    assertEquals(manifest.entrypoint, "/usr/bin/editor");
    assertEquals(manifest.args, undefined);
    assertEquals(manifest.env, undefined);

    await Deno.remove(tmpDir, { recursive: true });
});
