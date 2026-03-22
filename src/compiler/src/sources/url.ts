import { copy } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import type { FetchUrl } from "../types/fetchers.ts";
import type { SourceContext } from "./local.ts";

export async function executeUrl(
  fetcher: FetchUrl,
  ctx: SourceContext,
): Promise<void> {
  const tempFile = await Deno.makeTempFile();
  
  try {
    const headers = new Headers(fetcher.headers);
    
    if (fetcher.cookies) {
      const cookieHeader = Object.entries(fetcher.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
      headers.set("Cookie", cookieHeader);
    }

    const response = await fetch(fetcher.url, {
      method: fetcher.method || "GET",
      headers,
      body: fetcher.body,
    });

    if (!response.ok) {
      await response.arrayBuffer();
      throw new Error(`Failed to download ${fetcher.url}: ${response.status} ${response.statusText}`);
    }

    const content = await response.arrayBuffer();
    await Deno.writeFile(tempFile, new Uint8Array(content));

    const expectedHash = await hashFile(tempFile);
    if (expectedHash !== fetcher.sha256) {
      throw new Error(`Hash mismatch: expected ${fetcher.sha256}, got ${expectedHash}`);
    }

    const fileName = getFileNameFromUrl(fetcher.url);
    const destPath = join(ctx.outputDir, fileName);

    if (fetcher.unpack) {
      await unpackFile(tempFile, ctx.outputDir);
    } else {
      await Deno.mkdir(ctx.outputDir, { recursive: true });
      await copy(tempFile, destPath, { overwrite: true });
    }
  } finally {
    await Deno.remove(tempFile, { recursive: true }).catch(() => {});
  }
}

async function hashFile(path: string): Promise<string> {
  const content = await Deno.readFile(path);
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getFileNameFromUrl(url: string): string {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/");
  return pathParts[pathParts.length - 1] || "download";
}

async function unpackFile(source: string, destDir: string): Promise<void> {
  await Deno.mkdir(destDir, { recursive: true });
  
  if (source.endsWith(".zip")) {
    await unpackZip(source, destDir);
  } else if (source.endsWith(".tar") || source.endsWith(".tar.gz") || source.endsWith(".tgz")) {
    await unpackTar(source, destDir);
  } else {
    const fileName = source.split("/").pop() || "archive";
    await copy(source, join(destDir, fileName));
  }
}

async function unpackZip(zipPath: string, _destDir: string): Promise<void> {
  // Placeholder - would need zip library implementation
  await Deno.readFile(zipPath);
  throw new Error("ZIP unpacking not yet implemented");
}

async function unpackTar(tarPath: string, _destDir: string): Promise<void> {
  // Placeholder - would need tar library implementation
  await Deno.readFile(tarPath);
  throw new Error(" TAR unpacking not yet implemented");
}

export function getUrlDeps(_fetcher: FetchUrl): string[] {
  return [];
}
