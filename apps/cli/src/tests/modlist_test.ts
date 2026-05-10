import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { 
    listModlists, 
    getModlistInfo, 
    getBuildHistory, 
    addBuildToHistory 
} from "../store/modlist.ts";
import { parseModlistArgs } from "../commands/modlist.ts";

Deno.test("parseModlistArgs - parses list command", () => {
    const args = ["list", "--root", "/tmp/test"];
    const parsed = parseModlistArgs(args);
    assertEquals(parsed.subcommand, "list");
    assertEquals(parsed.root, "/tmp/test");
});

Deno.test("parseModlistArgs - parses build list command", () => {
    const args = ["build", "list", "test-modlist"];
    const parsed = parseModlistArgs(args);
    assertEquals(parsed.subcommand, "build");
    assertEquals(parsed.subsubcommand, "list");
    assertEquals(parsed.name, "test-modlist");
});

Deno.test("store - history management", async () => {
    const tmpDir = await Deno.makeTempDir();
    const modlistDir = join(tmpDir, "modlists", "my-modlist");
    await Deno.mkdir(modlistDir, { recursive: true });
    
    // Test empty history
    const emptyHistory = await getBuildHistory(tmpDir, "my-modlist");
    assertEquals(emptyHistory.length, 0);

    // Test add history
    await addBuildToHistory(tmpDir, "my-modlist", "hash123");
    const history = await getBuildHistory(tmpDir, "my-modlist");
    assertEquals(history.length, 1);
    assertEquals(history[0].hash, "hash123");

    // Test idempotent add
    await addBuildToHistory(tmpDir, "my-modlist", "hash123");
    const history2 = await getBuildHistory(tmpDir, "my-modlist");
    assertEquals(history2.length, 1);

    await Deno.remove(tmpDir, { recursive: true });
});
