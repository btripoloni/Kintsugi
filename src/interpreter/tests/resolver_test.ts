import { assertEquals, assertThrows } from "jsr:@std/assert";
import { resolveTransitiveLayers } from "../src/lib/modpack.ts";
import { Derivation, Source } from "../src/types/derivation.ts";

const dummySrc: Source = {
    type: "write_json",
    path: "test.json",
    content: { hello: "world" },
};

function mockDrv(name: string, deps: Derivation[] = []): Derivation {
    return {
        name,
        version: "1.0.0",
        out: `${name}-1.0.0`,
        src: dummySrc,
        deps,
        dependencies: deps.map((d) => d.out),
    };
}

Deno.test("resolveTransitiveLayers - simple linear dependency", () => {
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

    assertEquals(resolved.length, 4);
    assertEquals(resolved[0].name, "base");
    const names = resolved.slice(1, 3).map((r) => r.name);
    assertEquals(names.sort(), ["modA", "modB"]);
    assertEquals(resolved[3].name, "root");
});

Deno.test("resolveTransitiveLayers - circle detection throws error", () => {
    const modA: any = mockDrv("modA");
    const modB = mockDrv("modB", [modA]);
    modA.deps = [modB];
    modA.dependencies = [modB.out];

    assertThrows(
        () => {
            resolveTransitiveLayers([modB]);
        },
        Error,
        "Circular dependency detected",
    );
});

Deno.test("resolveTransitiveLayers - multiple independent roots", () => {
    const baseA = mockDrv("baseA");
    const baseB = mockDrv("baseB");
    const modA = mockDrv("modA", [baseA]);
    const modB = mockDrv("modB", [baseB]);

    const resolved = resolveTransitiveLayers([modA, modB]);

    assertEquals(resolved.length, 4);
    assertEquals(resolved[0].name, "baseA");
    assertEquals(resolved[1].name, "modA");
    assertEquals(resolved[2].name, "baseB");
    assertEquals(resolved[3].name, "modB");
});

Deno.test("resolveTransitiveLayers - single node", () => {
    const single = mockDrv("single");

    const resolved = resolveTransitiveLayers([single]);

    assertEquals(resolved.length, 1);
    assertEquals(resolved[0].name, "single");
});

Deno.test("resolveTransitiveLayers - empty list returns empty", () => {
    const resolved = resolveTransitiveLayers([]);
    assertEquals(resolved.length, 0);
});

Deno.test("resolveTransitiveLayers - shared dependency appears once", () => {
    const base = mockDrv("base");
    const modA = mockDrv("modA", [base]);
    const modB = mockDrv("modB", [base]);

    const resolved = resolveTransitiveLayers([modA, modB]);

    const baseCount = resolved.filter((r) => r.name === "base").length;
    assertEquals(baseCount, 1);
    assertEquals(resolved.length, 3);
});
