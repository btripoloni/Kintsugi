import { assertEquals, assertExists } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import {
    addVase,
    getVaseMetadata,
    listVases,
    removeVase,
    vaseExists,
} from "../../src/store/vase.ts";

Deno.test("addVase should create vase with auto-suffix", async () => {
    const tmpDir = await Deno.makeTempDir();
    const sourceDir = join(tmpDir, "source");
    await Deno.mkdir(sourceDir, { recursive: true });
    await Deno.writeTextFile(join(sourceDir, "game.exe"), "game content");

    const vaseName = await addVase(tmpDir, "skyrim", sourceDir);

    assertEquals(vaseName, "skyrim-1");
    assertEquals(await vaseExists(tmpDir, "skyrim-1"), true);

    const vaseName2 = await addVase(tmpDir, "skyrim", sourceDir);
    assertEquals(vaseName2, "skyrim-2");

    await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("listVases should return empty array when no vases", async () => {
    const tmpDir = await Deno.makeTempDir();

    const vases = await listVases(tmpDir);

    assertEquals(vases, []);
});

Deno.test("listVases should return sorted vase names", async () => {
    const tmpDir = await Deno.makeTempDir();
    const sourceDir = join(tmpDir, "source");
    await Deno.mkdir(sourceDir, { recursive: true });
    await Deno.writeTextFile(join(sourceDir, "file.txt"), "content");

    await addVase(tmpDir, "skyrim", sourceDir);
    await addVase(tmpDir, "fallout", sourceDir);
    await addVase(tmpDir, "skyrim", sourceDir);

    const vases = await listVases(tmpDir);

    assertEquals(vases, ["fallout-1", "skyrim-1", "skyrim-2"]);
});

Deno.test("vaseExists should return false for non-existent vase", async () => {
    const tmpDir = await Deno.makeTempDir();

    const exists = await vaseExists(tmpDir, "non-existent");

    assertEquals(exists, false);
});

Deno.test("removeVase should delete vase directory", async () => {
    const tmpDir = await Deno.makeTempDir();
    const sourceDir = join(tmpDir, "source");
    await Deno.mkdir(sourceDir, { recursive: true });
    await Deno.writeTextFile(join(sourceDir, "file.txt"), "content");

    const vaseName = await addVase(tmpDir, "test", sourceDir);
    assertEquals(await vaseExists(tmpDir, vaseName), true);

    await removeVase(tmpDir, vaseName);

    assertEquals(await vaseExists(tmpDir, vaseName), false);
});

Deno.test("getVaseMetadata should return metadata", async () => {
    const tmpDir = await Deno.makeTempDir();
    const sourceDir = join(tmpDir, "source");
    await Deno.mkdir(sourceDir, { recursive: true });
    await Deno.writeTextFile(join(sourceDir, "game.exe"), "game");

    const vaseName = await addVase(tmpDir, "skyrim", sourceDir);
    const metadata = await getVaseMetadata(tmpDir, vaseName);

    assertExists(metadata);
    assertEquals(metadata!.name, "skyrim-1");
    assertExists(metadata!.createdAt);
    assertEquals(metadata!.sourcePath, sourceDir);
});

Deno.test("addVase should create hardlinks, not copies", async () => {
    const tmpDir = await Deno.makeTempDir();
    const sourceDir = join(tmpDir, "source");
    await Deno.mkdir(join(sourceDir, "subdir"), { recursive: true });
    await Deno.writeTextFile(join(sourceDir, "game.exe"), "original");
    await Deno.writeTextFile(join(sourceDir, "subdir", "data.dat"), "data");

    const vaseName = await addVase(tmpDir, "test", sourceDir);
    const vasePath = join(tmpDir, "vases", vaseName);

    const gameStat = await Deno.stat(join(vasePath, "game.exe"));
    const dataStat = await Deno.stat(join(vasePath, "subdir", "data.dat"));

    assertEquals(gameStat.isFile, true);
    assertEquals(dataStat.isFile, true);

    assertEquals(gameStat.ino, (await Deno.stat(join(sourceDir, "game.exe"))).ino);
    assertEquals(dataStat.ino, (await Deno.stat(join(sourceDir, "subdir", "data.dat"))).ino);
});