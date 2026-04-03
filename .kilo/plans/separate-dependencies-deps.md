# Plano: Separar `dependencies` e `deps` no SDK

## Problema

Atualmente, a interface `Shard` expõe dois campos de dependência:
- `dependencies?: string[]` - array de hashes (uso interno do build)
- `deps?: Shard[]` - array de objetos Shard (uso declarativo do usuário)

Isso causa confusão porque ambos aparecem na API pública do SDK, quando o usuário faz `import { Shard } from "@btripoloni/kintsugi"`.

## Solução

Renomear para separar claramente o campo público do interno:
- `dependencies: Shard[]` - campo declarativo que o usuário usa (antigo `deps`)
- `_dependencyHashes: string[]` - campo interno prefixado com `_` (antigo `dependencies`)

## Arquivos a modificar

### SDK (packages/sdk)

1. **`packages/sdk/src/types/shard.ts`**
   - Renomear `dependencies?: string[]` para `_dependencyHashes?: string[]`
   - Renomear `deps?: Shard[]` para `dependencies?: Shard[]`

2. **`packages/sdk/src/lib/hash.ts`**
   - Atualizar interface interna para usar `_dependencyHashes` ao invés de `dependencies` (strings)
   - Atualizar `hashShard` para gerar `_dependencyHashes` no retorno
   - Remover `deps` do retorno

3. **`packages/sdk/src/lib/modpack.ts`**
   - Atualizar `resolveTransitiveLayers` para iterar sobre `dependencies` (Shard[]) ao invés de `deps`
   - Atualizar `compose` para passar `dependencies` como Shard[] e `_dependencyHashes` como string[]

### CLI (apps/cli)

4. **`apps/cli/src/lib/hash.ts`**
   - Atualizar para usar `dependencies` como `Shard[]` e `_dependencyHashes` como `string[]`
   - Remover referências a `deps`

5. **`apps/cli/src/lib/modpack.ts`**
   - Atualizar `resolveTransitiveLayers` para usar `dependencies` ao invés de `deps`
   - Atualizar `compose` para usar novos nomes

6. **`apps/cli/src/interpreter/interpreter.ts`**
   - Atualizar mapeamento de deps para dependencies
   - Remover `deps: undefined` e usar `_dependencyHashes`

## Detalhes das mudanças

### shard.ts (SDK)
```typescript
// Antes
export interface Shard {
    dependencies?: string[];
    deps?: Shard[];
}

// Depois
export interface Shard {
    dependencies?: Shard[];       // Público: usuário declara dependências como Shards
    _dependencyHashes?: string[]; // Interno: hashes calculados pelo build
}
```

### hash.ts (SDK)
```typescript
// Antes
export async function hashShard(data: {
    dependencies?: string[];
    deps?: unknown[];
}): Promise<Shard> {
    // ...
    return {
        dependencies: data.dependencies,
        deps: data.deps as Shard["deps"],
    };
}

// Depois
export async function hashShard(data: {
    dependencies?: Shard[];
    _dependencyHashes?: string[];
}): Promise<Shard> {
    const payload = JSON.stringify({
        // ... inclui dependencies como hashes para hashing
        _dependencyHashes: data._dependencyHashes,
    });
    // ...
    return {
        dependencies: data.dependencies,
        _dependencyHashes: data._dependencyHashes,
    };
}
```

### modpack.ts (SDK e CLI)
```typescript
// Antes
if (drv.deps) {
    for (const dep of drv.deps) { visit(dep); }
}

// Depois
if (drv.dependencies) {
    for (const dep of drv.dependencies) { visit(dep); }
}
```

### interpreter.ts (CLI)
```typescript
// Antes
const deps = drv.deps?.map((d) => { ... }) || [];
const finalDrv: Shard = {
    ...drv,
    dependencies: deps,
    deps: undefined,
};

// Depois
const dependencyHashes = drv.dependencies?.map((d) => { ... }) || [];
const finalDrv: Shard = {
    ...drv,
    _dependencyHashes: dependencyHashes,
};
```

## Benefícios

1. **API clara**: Usuário vê apenas `dependencies: Shard[]` - declarativo e intuitivo
2. **Campo interno explícito**: `_dependencyHashes` com prefixo `_` indica claramente que é interno
3. **Sem confusão**: Apenas um campo de dependência visível ao usuário
4. **Alinhado com Nix**: Separação clara entre declaração (input) e derivação (output)
