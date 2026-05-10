# Garbage Collection (GC) no Kintsugi

Este documento serve como um registro técnico da implementação do Garbage Collector no Kintsugi, detalhando sua lógica, arquitetura e uso.

## 1. Visão Geral

O Garbage Collector (GC) é responsável por manter a integridade e a eficiência do `store` do Kintsugi. Sua função principal é identificar e remover shards e receitas que não são mais necessários, economizando espaço em disco sem comprometer as modlists ativas.

## 2. Conceito de "Raízes" (Roots)

Diferente de sistemas de arquivos tradicionais, o Kintsugi usa uma abordagem de **acessibilidade (reachability)** similar à de gerenciadores de pacotes como o Nix. 

Uma "Raiz" para o GC é definida como qualquer shard que esteja atualmente apontado por um link simbólico `active` dentro da pasta de uma modlist (`~/.kintsugi/modlists/<nome>/active`).

## 3. Lógica de Implementação (Mark & Sweep)

O processo de GC segue duas fases principais:

### Fase 1: Marcação (Mark)
Nesta fase, o GC constrói um conjunto de todos os hashes "vivos" (alcançáveis):
1. **Identificação Inicial**: Lê todos os diretórios em `modlists/` e extrai o destino dos links `active`.
2. **Travessia Recursiva**: Para cada hash raiz encontrado:
    - Lê a receita correspondente em `store/recipes/<hash>.json`.
    - Adiciona os hashes listados em `_dependencyHashes` à fila de processamento.
    - Se a fonte for uma `composition`, adiciona todos os hashes em `src.layers` à fila.
3. **Resultado**: Um conjunto (Set) contendo todos os hashes que devem ser preservados.

### Fase 2: Limpeza (Sweep)
Nesta fase, o GC percorre o store e remove o que não foi marcado:
1. **Shards**: Itera sobre todas as pastas em `store/` (exceto a pasta `recipes`). Se o nome da pasta (hash) não estiver no conjunto de marcados, a pasta é deletada recursivamente.
2. **Receitas**: Itera sobre todos os arquivos `.json` em `store/recipes/`. Se o hash do arquivo não estiver no conjunto de marcados, o arquivo da receita é deletado.

## 4. Comandos e Uso

### Execução Padrão
Remove permanentemente shards e receitas órfãos.
```bash
kintsugi gc
```

### Simulação (Dry Run)
Lista o que seria deletado sem realizar nenhuma alteração no disco. Útil para auditoria.
```bash
kintsugi gc --dry-run
```

### Raiz Customizada
Permite executar o GC em um diretório do Kintsugi diferente do padrão.
```bash
kintsugi gc --root /caminho/para/kintsugi
```

## 5. Decisões Arquiteturais

- **Determinismo**: O GC baseia-se puramente nos hashes e nas definições de receitas, garantindo que o que é deletado é estritamente o que não tem referência formal.
- **Segurança**: Se um link `active` estiver quebrado ou apontar para algo fora do store, o GC ignora essa raiz específica para evitar erros catastróficos, mas continua processando outras modlists.
- **Independência de Estado**: Não utilizamos um banco de dados externo para rastrear dependências; o próprio store é a "fonte da verdade" através das receitas JSON.

## 6. Manutenção Futura

Ao adicionar novos tipos de `Fetcher` ou `Source`, é crucial atualizar a função `getReachableHashes` em `apps/cli/src/commands/gc.ts` caso esses novos tipos introduzam novas formas de referenciar outros shards.
