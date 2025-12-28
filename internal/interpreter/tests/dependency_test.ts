import { assertEquals, assertThrows } from "jsr:@std/assert";
import { resolveTransitiveLayers } from "../lib/modpack.ts";
import { Derivation, Source } from "../lib/types.ts";

const dummySrc: Source = { type: "write_text", path: "test.txt", content: "hello" };

function mockDrv(name: string, deps: Derivation[] = []): Derivation {
    const hash = name; // Simplify for testing
    return {
        name,
        version: "1.0.0",
        out: `${hash}-drv-1.0.0`,
        src: dummySrc,
        deps,
        dependencies: deps.map(d => d.out)
    };
}

Deno.test("resolveTransitiveLayers - simple linear", () => {
    const base = mockDrv("base");
    const modA = mockDrv("modA", [base]);
    const modB = mockDrv("modB", [modA]);

    const resolved = resolveTransitiveLayers([modB]);
    
    assertEquals(resolved.length, 3);
    assertEquals(resolved[0].name, "base");
    assertEquals(resolved[1].name, "modA");
    assertEquals(resolved[2].name, "modB");
});

Deno.test("resolveTransitiveLayers - diamond dependency", () => {
    const base = mockDrv("base");
    const modA = mockDrv("modA", [base]);
    const modB = mockDrv("modB", [base]);
    const root = mockDrv("root", [modA, modB]);

    const resolved = resolveTransitiveLayers([root]);
    
    // Order should be: base, (modA/modB), root
    assertEquals(resolved.length, 4);
    assertEquals(resolved[0].name, "base");
    // modA and modB can be in any order but both must be before root
    const names = resolved.slice(1, 3).map(r => r.name);
    assertEquals(names.sort(), ["modA", "modB"]);
    assertEquals(resolved[3].name, "root");
});

Deno.test("resolveTransitiveLayers - circle detection", () => {
    const modA: any = mockDrv("modA");
    const modB: any = mockDrv("modB", [modA]);
    modA.deps = [modB]; // Create cycle
    modA.dependencies = [modB.out];

    assertThrows(() => {
        resolveTransitiveLayers([modB]);
    }, Error, "Circular dependency detected");
});
