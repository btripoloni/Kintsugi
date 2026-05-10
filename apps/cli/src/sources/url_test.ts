import { assertEquals, assertRejects } from "jsr:@std/assert";
import { basename, join } from "jsr:@std/path";
import { exists } from "jsr:@std/fs";
import { executeUrl } from "./url.ts";
import type { SourceContext } from "./types.ts";

Deno.test("url source unpack: zip extraction", async (t) => {
    const testDir = await Deno.makeTempDir();

    // Create test zip file
    const zipContent = new Uint8Array([
        0x50,
        0x4b,
        0x03,
        0x04,
        0x14,
        0x00,
        0x00,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x21,
        0x00,
        0x85,
        0x56,
        0x52,
        0x3c,
        0x02,
        0x00,
        0x00,
        0x00,
        0x02,
        0x00,
        0x00,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x74,
        0x65,
        0x73,
        0x74,
        0x2e,
        0x74,
        0x78,
        0x74,
        0x4b,
        0x4c,
        0x4e,
        0xce,
        0x4f,
        0x49,
        0x04,
        0x00,
        0x50,
        0x4b,
        0x01,
        0x02,
        0x14,
        0x00,
        0x14,
        0x00,
        0x00,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x21,
        0x00,
        0x85,
        0x56,
        0x52,
        0x3c,
        0x02,
        0x00,
        0x00,
        0x00,
        0x02,
        0x00,
        0x00,
        0x00,
        0x08,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x74,
        0x65,
        0x73,
        0x74,
        0x2e,
        0x74,
        0x78,
        0x74,
        0x50,
        0x4b,
        0x05,
        0x06,
        0x00,
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x4a,
        0x00,
        0x00,
        0x00,
        0x36,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
    ]);
    const zipPath = join(testDir, "test.zip");
    await Deno.writeFile(zipPath, zipContent);

    // Start local file server
    const server = Deno.serve({ port: 0 }, async (req) => {
        if (req.url.endsWith("/test.zip")) {
            return new Response(zipContent);
        }
        return new Response("Not found", { status: 404 });
    });
    const addr = server.addr as Deno.NetAddr;

    try {
        const outputDir = join(testDir, "output");
        const ctx: SourceContext = {
            outputDir,
            modlistRoot: testDir,
        };

        await executeUrl({
            type: "url",
            url: `http://127.0.0.1:${addr.port}/test.zip`,
            sha256: "7a94271962540463d3b0f9b0c1d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4", // fake hash for test
            unpack: true,
        }, ctx);

        const extractedPath = join(outputDir, "test.txt");
        assertEquals(await exists(extractedPath), true);
        const content = await Deno.readTextFile(extractedPath);
        assertEquals(content.trim(), "test");
    } finally {
        await server.shutdown();
        await Deno.remove(testDir, { recursive: true });
    }
});

Deno.test("url source unpack: without unpack flag copies file", async (t) => {
    const testDir = await Deno.makeTempDir();
    const testData = new TextEncoder().encode("test content");
    const sha256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

    const server = Deno.serve({ port: 0 }, (req) => {
        if (req.url.endsWith("/file.bin")) {
            return new Response(testData);
        }
        return new Response("Not found", { status: 404 });
    });
    const addr = server.addr as Deno.NetAddr;

    try {
        const outputDir = join(testDir, "output");
        const ctx: SourceContext = {
            outputDir,
            modlistRoot: testDir,
        };

        await executeUrl({
            type: "url",
            url: `http://127.0.0.1:${addr.port}/file.bin`,
            sha256: sha256,
            unpack: false,
        }, ctx);

        const filePath = join(outputDir, "file.bin");
        assertEquals(await exists(filePath), true);
        const content = await Deno.readFile(filePath);
        assertEquals(content, testData);
    } finally {
        await server.shutdown();
        await Deno.remove(testDir, { recursive: true });
    }
});

Deno.test("url source unpack: unknown archive type copies file", async (t) => {
    const testDir = await Deno.makeTempDir();
    const testData = new TextEncoder().encode("test content");
    const sha256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

    const server = Deno.serve({ port: 0 }, (req) => {
        if (req.url.endsWith("/file.dat")) {
            return new Response(testData);
        }
        return new Response("Not found", { status: 404 });
    });
    const addr = server.addr as Deno.NetAddr;

    try {
        const outputDir = join(testDir, "output");
        const ctx: SourceContext = {
            outputDir,
            modlistRoot: testDir,
        };

        await executeUrl({
            type: "url",
            url: `http://127.0.0.1:${addr.port}/file.dat`,
            sha256: sha256,
            unpack: true,
        }, ctx);

        const filePath = join(outputDir, "file.dat");
        assertEquals(await exists(filePath), true);
    } finally {
        await server.shutdown();
        await Deno.remove(testDir, { recursive: true });
    }
});
