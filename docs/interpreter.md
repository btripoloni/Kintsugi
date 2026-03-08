# Interpretador

O interpretador é responsável por executar as expressões TypeScript e gerar receitas JSON para o compilador.

## 1. Visão Geral

O interpretador usa Deno como runtime e a biblioteca TypeScript está disponível como um pacote JSR: `jsr:@btripoloni/kintsugi`.

A biblioteca é importada automaticamente quando você cria um novo modlist com `kintsugi init`.

## 2. Entrada e Saída

**Entrada:**
- Caminho para pasta do modlist (contendo `modlist.json` e `main.ts`)

**Saída:**
- Arquivos JSON em `/recipes/[hash]-[nome da receita]-[versão].json`
- Retorna hash da receita raiz para stdout

## 2.1 Workflow do Usuário
1. Usuário roda `kintsugi init meu-modlist`.
2. O sistema cria `~/.kintsugi/modlists/meu-modlist/` contendo `modlist.json` e `main.ts`.
3. Usuário edita `main.ts` para definir o modlist.
4. Usuário roda `kintsugi build` dentro da pasta.
5. O executor roda o interpretador sobre o arquivo `main.ts`.


## 3. API de Expressões

As expressões usam funções fornecidas pela biblioteca padrão do Kintsugi, disponível no pacote JSR `jsr:@btripoloni/kintsugi`.

Para a lista de fontes disponíveis, veja a [Biblioteca `sources`](./sources.md).

### 3.2 `Composition`

A função de um `Composition` é compor um conjunto de Shards em uma composição final, que pode ser executada. Uma composição é essencialmente uma lista ordenada de camadas de conteúdo.