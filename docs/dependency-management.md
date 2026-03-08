# Gerenciamento de Dependências Recursivas no Kintsugi

Este documento descreve como o Kintsugi gerencia dependências de forma recursiva
e automática, migrando de um modelo de "camadas manuais" para um modelo
inspirado no Nix, onde cada mod declara suas próprias dependências.

## 1. O Problema: Camadas Manuais

No modelo antigo, para compor um modlist, o usuário precisava definir cada `Shard` individualmente e depois listá-los manualmente na ordem de carregamento correta dentro da `composição`.

```text
Mods: [Game, ModA, ModB, MobC]
Composition:
  Name: "modlist"
  layeys: [Game, ModC, ModA, ModB]
```

Isso se torna insustentável em modlists grandes. Se o `Mod B` depende do `Mod A`, essa informação deve estar contida na definição do `Mod B`.

## 2. Proposta: Dependências Declarativas

Cada `Shard` agora declara suas próprias dependências. O sistema é responsável por resolver o grafo de dependências e gerar a ordem correta das camadas para a composição final.

### 2.1 Estrutura do Shard

Conforme definido em [Shards](./shards.md), os chards incluem um campo `dependencies`.
```

### 2.2 Exemplo de Uso

Agora, as dependências são declaradas diretamente no `Shard` que precisa delas.

```text
Mods: [Game, ModA, ModB, MobC]

ModB:
  name: "modB"
  dependencies: [ModA]

Composition:
  Name: "modlist"
  layeys: [Game, ModC, ModB]
```

## 3. Algoritmo de Resolução

O Kintsugi utiliza um algoritmo de **Ordenação Topológica** para transformar o grafo de dependências em uma lista linear de camadas.

### 3.1 Regras de Resolução

1.  **Deduplicação**: Se o `Mod C` depende de `A` e `B`, e ambos dependem de `game`, o `game` aparecerá apenas uma vez como a primeira camada.
2.  **Ordem**: As dependências sempre vêm antes dos dependentes. `game` virá antes de `modA`, que virá antes de `modB`.
3.  **Detecção de Ciclos**: O interpretador deve falhar caso existam dependências circulares (ex: A -> B -> A).

### 3.2 Fluxo no Interpretador

1.  Usuário chama `Composition( layers: [modB] )`.
2.  O interpretador analisa `modB` e suas `dependencies` recursivamente (usando uma busca em profundidade - DFS).
3.  Ele constrói um grafo de todos os Shards únicos.
4.  Gera uma lista ordenada onde as dependências vêm **antes** dos dependentes.
5.  Essa lista final (`[game, modA, modB]`) é passada como o campo `layers` para a receita da composição.

## 4. Vantagens

- **Modularidade**: Mods podem ser compartilhados entre diferentes modlists sem que o usuário precise conhecer sua árvore de dependências interna.
- **Segurança**: Garante que nenhum mod seja carregado sem que suas dependências (como loaders ou scripts) estejam presentes.
- **Imutabilidade**: O hash de um Shard agora reflete toda a sua árvore de dependências, garantindo que se uma dependência mudar, o Shard dependente também terá um novo hash.
