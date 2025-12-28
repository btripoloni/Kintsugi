# Gerenciamento de Dependências Recursivas no Kintsugi

Este documento descreve como o Kintsugi gerencia dependências de forma recursiva
e automática, migrando de um modelo de "camadas manuais" para um modelo
inspirado no Nix, onde cada mod declara suas próprias dependências.

## 1. O Problema: Camadas Manuais

No modelo antigo, para compor um modpack, o usuário precisava definir cada `Shard` individualmente e depois listá-los manualmente na ordem de carregamento correta dentro da `mkComposition`.

```typescript
// Antigo (Manual)
import { mkShard, mkComposition, sources } from "kintsugi";

// Shards são definidos sem conhecimento de suas dependências internas.
const game = await mkShard({
    name: "skyrim-se",
    version: "1.6.117",
    src: sources.fetch_vase({ vase: "skyrim-se-1.6.117" }),
});
const modA = await mkShard({
    name: "Mod A", // Ex: SKSE
    version: "1.0",
    src: sources.fetch_url({ url: "https://example.com/mod_a.zip", sha256: "..." }),
});
const modB = await mkShard({
    name: "Mod B", // Ex: Um mod que depende do SKSE
    version: "1.0",
    src: sources.fetch_url({ url: "https://example.com/mod_b.zip", sha256: "..." }),
});

// O usuário precisa saber que B depende de A, e A depende do jogo,
// e listar tudo na ordem correta.
const modpack = await mkComposition({
    name: "MeuPackManual",
    layers: [game, modA, modB]
});
```

Isso se torna insustentável em modpacks grandes. Se o `Mod B` depende do `Mod A`, essa informação deve estar contida na definição do `Mod B`.

## 2. Proposta: Dependências Declarativas

Cada `Shard` agora declara suas próprias dependências. O sistema é responsável por resolver o grafo de dependências e gerar a ordem correta das camadas para a composição final.

### 2.1 Estrutura do Shard

Conforme definido em [Shards](./shards.md), a interface `ShardOptions` inclui um campo `dependencies`.

```typescript
export interface ShardOptions {
    name: string;
    version: string;
    src: Source;
    dependencies?: Shard[];
    // ...
}
```

### 2.2 Exemplo de Uso

Agora, as dependências são declaradas diretamente no `Shard` que precisa delas.

```typescript
import { mkShard, mkComposition, sources, bootstrap } from "kintsugi";

// O jogo base, sem dependências
const game = await mkShard({
    name: "skyrim-se",
    version: "1.6.117",
    src: sources.fetch_vase({ vase: "skyrim-se-1.6.117" }),
});

// Mod A declara sua dependência no jogo
const modA = await mkShard({
    name: "Mod A",
    version: "1.0",
    src: sources.fetch_url({ url: "https://example.com/mod_a.zip", sha256: "..." }),
    dependencies: [game],
});

// Mod B declara sua dependência no Mod A
const modB = await mkShard({
    name: "Mod B",
    version: "1.0",
    src: sources.fetch_url({ url: "https://example.com/mod_b.zip", sha256: "..." }),
    dependencies: [modA],
});

// O interpretador resolve a árvore (game -> modA -> modB) automaticamente.
// Apenas o "topo" do grafo é necessário para compor o modpack.
const modpack = await mkComposition({
    name: "MeuPackResolvido",
    layers: [modB] 
});

bootstrap(modpack);
```

## 3. Algoritmo de Resolução

O Kintsugi utiliza um algoritmo de **Ordenação Topológica** para transformar o grafo de dependências em uma lista linear de camadas.

### 3.1 Regras de Resolução

1.  **Deduplicação**: Se o `Mod C` depende de `A` e `B`, e ambos dependem de `game`, o `game` aparecerá apenas uma vez como a primeira camada.
2.  **Ordem**: As dependências sempre vêm antes dos dependentes. `game` virá antes de `modA`, que virá antes de `modB`.
3.  **Detecção de Ciclos**: O interpretador deve falhar caso existam dependências circulares (ex: A -> B -> A).

### 3.2 Fluxo no Interpretador

1.  Usuário chama `mkComposition({ layers: [modB] })`.
2.  O interpretador analisa `modB` e suas `dependencies` recursivamente (usando uma busca em profundidade - DFS).
3.  Ele constrói um grafo de todos os Shards únicos.
4.  Gera uma lista ordenada onde as dependências vêm **antes** dos dependentes.
5.  Essa lista final (`[game, modA, modB]`) é passada como o campo `layers` para a receita da composição.

## 4. Vantagens

- **Modularidade**: Mods podem ser compartilhados entre diferentes modpacks sem que o usuário precise conhecer sua árvore de dependências interna.
- **Segurança**: Garante que nenhum mod seja carregado sem que suas dependências (como loaders ou scripts) estejam presentes.
- **Imutabilidade**: O hash de um Shard agora reflete toda a sua árvore de dependências, garantindo que se uma dependência mudar, o Shard dependente também terá um novo hash.

---

> [!IMPORTANT]
> Esta mudança move a inteligência de resolução de dependências do **usuário** para o **Interpretador (Deno)**, mantendo o **Compilador (Go)** focado apenas na execução eficiente das camadas via links físicos.
