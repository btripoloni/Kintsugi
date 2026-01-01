# Shards

Shards são os blocos de construção fundamentais do Kintsugi, equivalentes às Derivações do Nix. Um Shard é uma descrição declarativa de um pacote, mod, configuração ou resultado de build.

## 1. Conceito

Um Shard é uma receita que, quando "realizada" pelo compilador, produz um diretório de saída fixo no Kintsugi Store (`~/.kintsugi/store/[hash]-[nome]-[versão]`).

Como os Shards são determinísticos, se a receita permanecer a mesma, o caminho e o conteúdo da saída também permanecerão os mesmos.

## 2. Estrutura de um Shard (Interpretador)

No interpretador TypeScript, um Shard é representado como um objeto com as seguintes propriedades:

- **name**: Um nome descritivo para o shard (ex: "skyrim-se", "skse").
- **version**: A versão do conteúdo.
- **src (Source)**: Um descritor explicando como obter o conteúdo inicial. Veja [Biblioteca `sources`](./sources-library.md).
- **dependencies**: Um array de outros objetos Shard ou hashes. Estes são resolvidos pelo gerenciador de dependências.
- **postBuild**: Um script shell opcional que roda após a Source ser realizada, mas antes do Shard ser finalizado no store.
- **permissions**: Lista opcional de permissões necessárias durante a build (ex: `["network"]`).

## 3. O Ciclo de Vida: De Receita ao Store

1. **Interpretação**: O interpretador Deno executa a expressão e calcula o hash do Shard com base em seus inputs (nome, versão, src, scripts, dependências).
2. **Geração de Receita**: Para cada Shard único, uma receita `.json` é salva em `~/.kintsugi/recipes/`.
3. **Checagem de Cache**: O compilador verifica se `/store/[hash]-[nome]-[versão]` já existe.
4. **Realização**:
   - O compilador cria um sandbox temporário.
   - A **Source** é realizada (ex: arquivo baixado ou caminho local copiado) dentro do sandbox.
   - Todas as **Dependências** são vinculadas ao ambiente de build conforme necessário.
   - O script **postBuild** é executado dentro do sandbox.
5. **Finalização**: O diretório resultante é movido para o caminho final do store e marcado como somente leitura.

## 4. Exemplo

```typescript
import { mkShard, sources } from "kintsugi";

const myMod = await mkShard({
  name: "cool-mod",
  version: "1.0.0",
  src: sources.fetch_url({
    url: "https://example.com/mod.zip",
    sha256: "...",
    unpack: true
  }),
  dependencies: [skyrim],
  postBuild: `
    # Limpa arquivos desnecessários
    rm -rf tests/
    # Move arquivos para os locais esperados
    mv Data/* .
  `
});
```

Ao separar a **Source** (obtenção de arquivos) da **Build** (script postBuild), os Kintsugi Shards permanecem altamente flexíveis e reprodutíveis.