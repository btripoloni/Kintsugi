import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { executeUrl } from "../../src/sources/url.ts";
import type { FetchUrl } from "../../src/types/fetchers.ts";

async function sha256(content: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("FetchUrl type should have correct type string", () => {
  const fetcher: FetchUrl = {
    type: "url",
    url: "https://example.com/mod.zip",
    sha256: "abc123",
  };

  assertEquals(fetcher.type, "url");
});

Deno.test("FetchUrl should serialize to JSON correctly", () => {
  const fetcher: FetchUrl = {
    type: "url",
    url: "https://example.com/mod.zip",
    sha256: "abc123",
    unpack: true,
  };

  const json = JSON.stringify(fetcher);
  const parsed = JSON.parse(json);

  assertEquals(parsed.type, "url");
  assertEquals(parsed.url, "https://example.com/mod.zip");
  assertEquals(parsed.sha256, "abc123");
  assertEquals(parsed.unpack, true);
});

Deno.test("FetchUrl should deserialize from JSON correctly", () => {
  const json = '{"type":"url","url":"https://example.com/mod.zip","sha256":"abc123","unpack":true}';
  const parsed = JSON.parse(json) as FetchUrl;

  assertEquals(parsed.type, "url");
  assertEquals(parsed.url, "https://example.com/mod.zip");
  assertEquals(parsed.sha256, "abc123");
  assertEquals(parsed.unpack, true);
});

Deno.test("FetchUrl should have optional method, headers, cookies, and body", () => {
  const fetcher: FetchUrl = {
    type: "url",
    url: "https://example.com/api",
    sha256: "def456",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cookies: { "session": "abc123" },
    body: '{"key":"value"}',
  };

  assertEquals(fetcher.method, "POST");
  assertEquals(fetcher.headers, { "Content-Type": "application/json" });
  assertEquals(fetcher.cookies, { "session": "abc123" });
  assertEquals(fetcher.body, '{"key":"value"}');
});

Deno.test("executeUrl should reject when hash mismatches", async () => {
  const tmpDir = await Deno.makeTempDir();
  const outputDir = join(tmpDir, "output");
  await Deno.mkdir(outputDir, { recursive: true });

  const fetcher: FetchUrl = {
    type: "url",
    url: "data:text/plain,hello",
    sha256: "wronghash",
  };

  await assertRejects(
    () => executeUrl(fetcher, { modlistRoot: tmpDir, outputDir }),
    Error,
    "Hash mismatch",
  );

  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("executeUrl should download from local HTTP server", async () => {
  const tmpDir = await Deno.makeTempDir();
  const outputDir = join(tmpDir, "output");
  await Deno.mkdir(outputDir, { recursive: true });

  const content = "test file content";
  const contentHash = await sha256(content);

  const ac = new AbortController();
  const server = Deno.serve({ port: 0, signal: ac.signal }, async (req) => {
    return new Response(content, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  });

  const addr = server.addr as Deno.NetAddr;
  const port = addr.port;

  const fetcher: FetchUrl = {
    type: "url",
    url: `http://localhost:${port}/file.txt`,
    sha256: contentHash,
  };

  await executeUrl(fetcher, { modlistRoot: tmpDir, outputDir });

  const downloadedContent = await Deno.readTextFile(join(outputDir, "file.txt"));
  assertEquals(downloadedContent, content);

  ac.abort();
  await server.finished;
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("executeUrl should send custom headers", async () => {
  const tmpDir = await Deno.makeTempDir();
  const outputDir = join(tmpDir, "output");
  await Deno.mkdir(outputDir, { recursive: true });

  const content = "content";
  const contentHash = await sha256(content);

  const receivedHeaders: { value: Headers } = { value: null as unknown as Headers };

  const ac = new AbortController();
  const server = Deno.serve({ port: 0, signal: ac.signal }, async (req) => {
    receivedHeaders.value = req.headers;
    return new Response(content);
  });

  const addr = server.addr as Deno.NetAddr;
  const port = addr.port;

  const fetcher: FetchUrl = {
    type: "url",
    url: `http://localhost:${port}/file.txt`,
    sha256: contentHash,
    headers: { "X-Custom-Header": "custom-value" },
  };

  await executeUrl(fetcher, { modlistRoot: tmpDir, outputDir });

  assertEquals(receivedHeaders.value.get("x-custom-header"), "custom-value");

  ac.abort();
  await server.finished;
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("executeUrl should send cookies", async () => {
  const tmpDir = await Deno.makeTempDir();
  const outputDir = join(tmpDir, "output");
  await Deno.mkdir(outputDir, { recursive: true });

  const content = "content";
  const contentHash = await sha256(content);

  const receivedHeaders: { value: Headers } = { value: null as unknown as Headers };

  const ac = new AbortController();
  const server = Deno.serve({ port: 0, signal: ac.signal }, async (req) => {
    receivedHeaders.value = req.headers;
    return new Response(content);
  });

  const addr = server.addr as Deno.NetAddr;
  const port = addr.port;

  const fetcher: FetchUrl = {
    type: "url",
    url: `http://localhost:${port}/file.txt`,
    sha256: contentHash,
    cookies: { "session": "abc123", "token": "xyz" },
  };

  await executeUrl(fetcher, { modlistRoot: tmpDir, outputDir });

  const cookieHeader = receivedHeaders.value.get("cookie");
  assertExists(cookieHeader?.includes("session=abc123"));
  assertExists(cookieHeader?.includes("token=xyz"));

  ac.abort();
  await server.finished;
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("executeUrl should reject on HTTP error", async () => {
  const tmpDir = await Deno.makeTempDir();
  const outputDir = join(tmpDir, "output");
  await Deno.mkdir(outputDir, { recursive: true });

  const ac = new AbortController();
  const server = Deno.serve({ port: 0, signal: ac.signal }, async (req) => {
    await req.text();
    return new Response("Not Found", { status: 404 });
  });

  const addr = server.addr as Deno.NetAddr;
  const port = addr.port;

  const fetcher: FetchUrl = {
    type: "url",
    url: `http://localhost:${port}/file.txt`,
    sha256: "anyhash",
  };

  await assertRejects(
    () => executeUrl(fetcher, { modlistRoot: tmpDir, outputDir }),
    Error,
    "Failed to download",
  );

  ac.abort();
  await server.finished;
  await Deno.remove(tmpDir, { recursive: true });
});
