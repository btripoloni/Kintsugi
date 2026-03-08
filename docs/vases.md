# Vases

Os **Vases** são um sistema do Kintsugi para gerenciar arquivos grandes, pré-existentes e imutáveis, como os assets base de um jogo. Enquanto a maioria dos componentes de um modlist são [Shards](./shards.md) construídos a partir de fontes externas, os Vases são "preparados" uma única vez e depois reutilizados em múltiplas builds sem custo de cópia.

## Diferenças de um Shard para um Vase:
O shard é montado apartir de uma receita em um processo de build, ele faz downloads na internet, copia arquivos, faz qualquer processo descrito na receita.
Apesar de você usar um vase como source na receita, ele não passa por um processo de build, assim que o vase é criado, ele já é o estado final, montado previamente pelo usuario.
Casos comuns para vases: arquivos de jogos não gerenciados por launchers, mods que não tem links de download por algum motivo, ou uma versão especifica, mods criados pelo proprio usuario.

## 1. O Conceito

Pense em um Vase como um contêiner para arquivos que:

-   **São Grandes:** Por exemplo, os 100GB de uma instalação de jogo.
-   **Não Mudam com Frequência:** São os arquivos originais do desenvolvedor.
-   **São a Base para modlists:** Múltiplos modlists podem usar a mesma instalação de jogo como base.

Em vez de copiar esses arquivos massivos para o [Store](./README.md#arquitetura) a cada build, o Kintsugi utiliza Vases. Um Vase reside em um diretório dedicado (`~/.kintsugi/vases/`) e, quando usado em uma build, seu conteúdo é **vinculado por hardlink**, uma operação de metadados instantânea que não consome espaço extra em disco.

Isso os torna a forma mais eficiente de usar um jogo base como a primeira camada de um modlist.

## 2. Gerenciando Vases (CLI)

A gestão de Vases é feita através do comando `kintsugi vase`:

-   **`kintsugi vase add <nome> <caminho>`**: Cria um novo Vase. O comando copia o conteúdo do `<caminho>` (ex: a pasta de instalação do seu jogo) para o diretório de Vases com o `<nome>` especificado.
    -   *Exemplo:* `kintsugi vase add skyrim-se-1.6.117 /home/user/steam/steamapps/common/Skyrim\ Special\ Edition`
-   **`kintsugi vase remove <nome>`**: Remove um Vase do sistema. A operação falhará se alguma build ainda depender dele.
-   **`kintsugi vase list`**: Lista todos os Vases disponíveis no seu sistema.

## 3. Usando um Vase em um modlist

Dentro de um shard, uma das possiveis opções de sources possiveis para usar é a Vase. Esta fonte instrui o compilador a localizar o Vase especificado e vincular seu conteúdo como a primeira camada da sua build.
