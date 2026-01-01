import { resolveTransitiveLayers } from "./lib/modpack.ts";
import { Derivation, Source } from "./lib/types.ts";

const dummySrc: Source = { type: "write_text", path: "test.txt", content: "hello" };

function mockDrv(name: string, deps: Derivation[] = []): Derivation {
    return {
        name,
        version: "1.0.0",
        out: `${name}-hash`,
        src: dummySrc,
        deps,
        dependencies: deps.map(d => d.out)
    };
}

// Grafo do usuário:
// A (base)
// B -> A
// C -> A
// D -> C
// E -> C
const A = mockDrv("A");
const B = mockDrv("B", [A]);
const C = mockDrv("C", [A]);
const D = mockDrv("D", [C]);
const E = mockDrv("E", [C]);

console.log("Cenário 1: layers: [C, B]");
const result1 = resolveTransitiveLayers([C, B]);
console.log(result1.map(r => r.name).join(" -> "));

console.log("\nCenário 2: layers: [E, D]");
const result2 = resolveTransitiveLayers([E, D]);
console.log(result2.map(r => r.name).join(" -> "));

// E se D dependesse de E?
const E2 = mockDrv("E");
const D2 = mockDrv("D", [E2]);
console.log("\nCenário 3 (D depende de E): layers: [D]");
const result3 = resolveTransitiveLayers([D2]);
console.log(result3.map(r => r.name).join(" -> "));
