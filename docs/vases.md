# Vases

Os **Vases** são um sistema do Kintsugi para gerenciar arquivos grandes, pré-existentes e imutáveis, como os assets base de um jogo. Enquanto a maioria dos componentes de um modpack são [Shards](./shards.md) construídos a partir de fontes externas, os Vases são "preparados" uma única vez e depois reutilizados em múltiplas builds sem custo de cópia.

## 1. O Conceito

Pense em um Vase como um contêiner para arquivos que:

-   **São Grandes:** Por exemplo, os 100GB de uma instalação de jogo.
-   **Não Mudam com Frequência:** São os arquivos originais do desenvolvedor.
-   **São a Base para Modpacks:** Múltiplos modpacks podem usar a mesma instalação de jogo como base.

Em vez de copiar esses arquivos massivos para o [Store](./README.md#arquitetura) a cada build, o Kintsugi utiliza Vases. Um Vase reside em um diretório dedicado (`~/.kintsugi/vases/`) e, quando usado em uma build, seu conteúdo é **vinculado por hardlink**, uma operação de metadados instantânea que não consome espaço extra em disco.

Isso os torna a forma mais eficiente de usar um jogo base como a primeira camada de um modpack.

## 2. Gerenciando Vases (CLI)

A gestão de Vases é feita através do comando `kintsugi vase`:

-   **`kintsugi vase add <nome> <caminho>`**: Cria um novo Vase. O comando copia o conteúdo do `<caminho>` (ex: a pasta de instalação do seu jogo) para o diretório de Vases com o `<nome>` especificado.
    -   *Exemplo:* `kintsugi vase add skyrim-se-1.6.117 /home/user/steam/steamapps/common/Skyrim\ Special\ Edition`
-   **`kintsugi vase remove <nome>`**: Remove um Vase do sistema. A operação falhará se alguma build ainda depender dele.
-   **`kintsugi vase list`**: Lista todos os Vases disponíveis no seu sistema.

## 3. Usando um Vase em um Modpack

Dentro de uma expressão de modpack, você utiliza um Vase através da fonte [`fetch_vase`](./sources.md#3-fetch_vase). Esta fonte instrui o compilador a localizar o Vase especificado e vincular seu conteúdo como a primeira camada da sua build.

```typescript
// main.ts
import { mkBuild, fetch_vase } from "kintsugi/lib.ts";

// Usa o Vase "skyrim-se-1.6.117" como a camada base do modpack.
const game = fetch_vase({
    vase: "skyrim-se-1.6.117",
});

export default mkBuild({
  name: "meu-modpack",
  layers: [game, /* ...outros mods */],
  // ...
});
```

Ao usar `fetch_vase`, você garante que a base do seu modpack seja adicionada de forma instantânea e sem duplicar arquivos, mantendo a filosofia de eficiência do Kintsugi.