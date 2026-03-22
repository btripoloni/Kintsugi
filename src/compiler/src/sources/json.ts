import { join } from "jsr:@std/path";
import type { WriteJson } from "../types/fetchers.ts";
import type { SourceContext } from "./local.ts";

export async function executeJson(
  fetcher: WriteJson,
  ctx: SourceContext,
): Promise<void> {
  const destPath = join(ctx.outputDir, fetcher.path);
  const destDir = destPath.substring(0, destPath.lastIndexOf("/"));
  
  await Deno.mkdir(destDir, { recursive: true });
  
  const content = JSON.stringify(fetcher.content, null, 2);
  await Deno.writeTextFile(destPath, content);
}

export function getJsonDeps(_fetcher: WriteJson): string[] {
  return [];
}
