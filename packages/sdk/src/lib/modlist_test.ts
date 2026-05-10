import { assertEquals } from "jsr:@std/assert";
import { modlist } from "./modpack.ts";
import type { Shard } from "../types/shard.ts";

Deno.test("modlist function", async (t) => {
    const modA: Shard = {
        name: "mod-a",
        version: "1.0.0",
        src: { type: "url", url: "https://example.com/mod-a.zip", sha256: "aaa" },
    };

    const modB: Shard = {
        name: "mod-b",
        version: "1.0.0",
        src: { type: "url", url: "https://example.com/mod-b.zip", sha256: "bbb" },
        dependencies: [modA],
    };

    const modC: Shard = {
        name: "mod-c",
        version: "1.0.0",
        src: { type: "url", url: "https://example.com/mod-c.zip", sha256: "ccc" },
        dependencies: [modA],
    };

    await t.step("creates valid composition shard", async () => {
        const pack = await modlist({
            name: "test-pack",
            mods: [modB, modC],
        });

        assertEquals(pack.name, "test-pack");
        assertEquals(pack.version, "generated");
        assertEquals(pack.src.type, "composition");
    });

    await t.step("automatically includes transitive dependencies", async () => {
        const pack = await modlist({
            name: "test-pack",
            mods: [modB, modC],
        });

        // modA é dependência de ambos, deve estar presente uma única vez
        assertEquals(pack.dependencies?.length, 3);

        // Ordem correta: dependências vem primeiro
        const names = pack.dependencies?.map((s) => s.name);
        assertEquals(names, ["mod-a", "mod-b", "mod-c"]);
    });

    await t.step("deduplicates same shard multiple times", async () => {
        const pack = await modlist({
            name: "test-pack",
            mods: [modA, modA, modA, modB],
        });

        assertEquals(pack.dependencies?.length, 2);
    });
});
