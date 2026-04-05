import { copy } from "jsr:@std/fs";
import { dirname, join } from "jsr:@std/path";
import type { FetchUrl } from "@btripoloni/kintsugi";
import type { SourceContext } from "./types.ts";

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
            throw new Error(
                `Failed to download ${fetcher.url}: ${response.status} ${response.statusText}`,
            );
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
            await unpackFile(tempFile, ctx.outputDir, fileName);
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
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getFileNameFromUrl(url: string): string {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    return pathParts[pathParts.length - 1] || "download";
}

async function unpackFile(
    source: string,
    destDir: string,
    originalFilename?: string,
): Promise<void> {
    await Deno.mkdir(destDir, { recursive: true });

    // Use original filename extension if provided (temp files have random names)
    const checkName = originalFilename ?? source;

    if (checkName.endsWith(".zip")) {
        await unpackZip(source, destDir);
    } else if (checkName.endsWith(".7z")) {
        await unpack7z(source, destDir);
    } else if (
        checkName.endsWith(".tar") || checkName.endsWith(".tar.gz") || checkName.endsWith(".tgz")
    ) {
        await unpackTar(source, destDir);
    } else {
        const fileName = originalFilename || source.split("/").pop() || "archive";
        await copy(source, join(destDir, fileName));
    }
}

async function unpackZip(zipPath: string, destDir: string): Promise<void> {
    try {
        const command = new Deno.Command("unzip", {
            args: ["-q", "-o", zipPath, "-d", destDir],
            stdout: "null",
            stderr: "null",
        });

        const output = await command.output();
        if (!output.success) {
            throw new Error(`unzip failed with code ${output.code}`);
        }
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            throw new Error(
                "unzip is not installed. Please install unzip package for zip support.",
            );
        }
        throw err;
    }
}

async function unpack7z(sevenZipPath: string, destDir: string): Promise<void> {
    try {
        const command = new Deno.Command("7z", {
            args: ["x", "-y", `-o${destDir}`, sevenZipPath],
            stdout: "null",
            stderr: "null",
        });

        const output = await command.output();
        if (!output.success) {
            throw new Error(`7z failed with code ${output.code}`);
        }
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            throw new Error(
                "7zip is not installed. Please install p7zip-full package for 7z support.",
            );
        }
        throw err;
    }
}

async function unpackTar(tarPath: string, destDir: string): Promise<void> {
    try {
        const command = new Deno.Command("tar", {
            args: ["-xf", tarPath, "-C", destDir],
            stdout: "null",
            stderr: "null",
        });

        const output = await command.output();
        if (!output.success) {
            throw new Error(`tar failed with code ${output.code}`);
        }
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            throw new Error("tar command not found.");
        }
        throw err;
    }
}

export function getUrlDeps(_fetcher: FetchUrl): string[] {
    return [];
}
