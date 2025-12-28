# Sistema de Fontes (Sources)

A propriedade `src` de um [Shard](./shards.md) define como seu conteúdo inicial é adquirido ou gerado. O Kintsugi utiliza um sistema modular de **Fontes** (Sources) para essa finalidade. Cada fonte é um mecanismo especializado em obter dados de um tipo específico de origem, como uma URL, um diretório local ou até mesmo gerar conteúdo dinamicamente.

Este sistema é projetado para ser extensível, permitindo que novas fontes sejam adicionadas no futuro sem alterar a lógica central do compilador.

Para uma lista detalhada de todas as funções de fonte disponíveis e como usá-las, consulte a documentação da [Biblioteca `sources`](./sources-library.md).