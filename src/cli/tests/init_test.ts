import { assertEquals, assertRejects } from "jsr:@std/assert";
import { initCommand, parseInitArgs } from "../commands/init.ts";

Deno.test("parseInitArgs - parses name argument", () => {
    const args = parseInitArgs(["mymodlist"]);
    assertEquals(args.name, "mymodlist");
    assertEquals(args.force, false);
});

Deno.test("parseInitArgs - returns undefined name when not provided", () => {
    const args = parseInitArgs([]);
    assertEquals(args.name, undefined);
    assertEquals(args.force, false);
});

Deno.test("parseInitArgs - parses --force flag", () => {
    const args = parseInitArgs(["mymodlist", "--force"]);
    assertEquals(args.name, "mymodlist");
    assertEquals(args.force, true);
});

Deno.test("parseInitArgs - parses --force with name", () => {
    const args = parseInitArgs(["--force", "mymodlist"]);
    assertEquals(args.name, "mymodlist");
    assertEquals(args.force, true);
});

Deno.test("parseInitArgs - parses -f short flag", () => {
    const args = parseInitArgs(["mymodlist", "-f"]);
    assertEquals(args.force, true);
    assertEquals(args.name, "mymodlist");
});

Deno.test("initCommand - creates folder with name and files inside", async () => {
    const tmpDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
        Deno.chdir(tmpDir);

        await initCommand({ name: "skyrim", force: true });

        const folderPath = `${tmpDir}/skyrim`;
        const denoJsonPath = `${folderPath}/deno.json`;
        const mainTsPath = `${folderPath}/main.ts`;
        const modlistJsonPath = `${folderPath}/modlist.json`;

        const folderExists = await Deno.stat(folderPath).then(() => true).catch(() => false);
        const denoJsonExists = await Deno.stat(denoJsonPath).then(() => true).catch(() => false);
        const mainTsExists = await Deno.stat(mainTsPath).then(() => true).catch(() => false);
        const modlistJsonExists = await Deno.stat(modlistJsonPath).then(() => true).catch(() => false);

        assertEquals(folderExists, true);
        assertEquals(denoJsonExists, true);
        assertEquals(mainTsExists, true);
        assertEquals(modlistJsonExists, true);

        const denoJson = await Deno.readTextFile(denoJsonPath);
        assertEquals(denoJson.includes('"jsr:@btripoloni/kintsugi"'), true);

        const mainTs = await Deno.readTextFile(mainTsPath);
        assertEquals(mainTs.includes('name: "skyrim"'), true);
        assertEquals(mainTs.includes("export default"), true);
    } finally {
        Deno.chdir(originalCwd);
        await Deno.remove(tmpDir, { recursive: true });
    }
});

Deno.test("initCommand - throws when folder exists without --force", async () => {
    const tmpDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
        Deno.chdir(tmpDir);
        await Deno.mkdir("mymodlist");

        await assertRejects(
            () => initCommand({ name: "mymodlist", force: false }),
            Error,
            "already exists",
        );
    } finally {
        Deno.chdir(originalCwd);
        await Deno.remove(tmpDir, { recursive: true });
    }
});

Deno.test("initCommand - overwrites folder with --force", async () => {
    const tmpDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
        Deno.chdir(tmpDir);
        await Deno.mkdir("mymodlist");

        await initCommand({ name: "mymodlist", force: true });

        const denoJson = await Deno.readTextFile(`${tmpDir}/mymodlist/deno.json`);
        assertEquals(denoJson.includes('"jsr:@btripoloni/kintsugi"'), true);
    } finally {
        Deno.chdir(originalCwd);
        await Deno.remove(tmpDir, { recursive: true });
    }
});

Deno.test("initCommand - requires name argument", async () => {
    const tmpDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
        Deno.chdir(tmpDir);

        let errorThrown = false;
        try {
            await initCommand({ name: undefined as unknown as string, force: false });
        } catch (e) {
            errorThrown = true;
        }

        assertEquals(errorThrown, true);
    } finally {
        Deno.chdir(originalCwd);
        await Deno.remove(tmpDir, { recursive: true });
    }
});
