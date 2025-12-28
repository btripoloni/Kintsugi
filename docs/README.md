# Documentação do Kintsugi

Bem-vindo à documentação do Kintsugi, um gerenciador de modpacks para jogos declarativo, reproduzível e isolado, fortemente inspirado no [Nix](https://nixos.org/).

## Filosofia

O Kintsugi foi projetado com base em três princípios fundamentais:

-   **Declarativo:** Você descreve o estado final desejado do seu modpack, e o Kintsugi se encarrega de alcançar esse estado. Em vez de uma sequência de passos manuais ("instale o mod A, depois o mod B"), você simplesmente declara que seu modpack "contém os mods A e B".
-   **Reproduzível:** Uma build do Kintsugi é uma função pura de suas entradas. Qualquer pessoa, em qualquer máquina, com a mesma receita de modpack, produzirá uma instalação bit-a-bit idêntica.
-   **Isolado:** Cada build é autocontida e imutável, armazenada em um local dedicado (o "Store"). Isso permite manter múltiplas versões de um modpack, realizar testes sem risco e fazer rollbacks para uma versão anterior de forma instantânea.

## Arquitetura

O Kintsugi é composto por três componentes principais que trabalham em conjunto:

1.  **Interpretador (Deno/TypeScript):** Responsável por executar as "expressões" do seu modpack — scripts TypeScript que definem quais mods, configurações e patches incluir. Ele traduz essas expressões em "receitas" JSON, que são instruções claras para o próximo componente.
2.  **Compilador (Go):** O motor de construção do Kintsugi. Ele lê as receitas geradas pelo interpretador, baixa as fontes, executa scripts de patch, e monta a estrutura de arquivos final da sua build no Store. Ele é intencionalmente "burro", apenas seguindo as instruções da receita, o que o torna agnóstico ao jogo que está sendo gerenciado.
3.  **Executor (Go):** A interface de linha de comando (`kintsugi`) que você usa para gerenciar seus modpacks. Ele orquestra o trabalho do Interpretador e do Compilador e fornece comandos para `run` (rodar), `build` (construir), `gc` (coletar lixo), e mais.

O fluxo de trabalho básico é: **Expressão (TS) -> Receita (JSON) -> Build (diretório no Store)**.

## Conceitos Fundamentais

Para entender como usar o Kintsugi, é importante conhecer seus blocos de construção:

-   [**Shards**](./shards.md): As unidades atômicas do Kintsugi. Um Shard é uma receita para produzir um conjunto de arquivos no Store, seja um mod, um patch de configuração ou a build final de um modpack.
-   [**Fontes (Sources)**](./sources.md): Mecanismos que o Kintsugi usa para obter conteúdo, como baixar de uma URL (`fetch_url`), copiar de um diretório local (`fetch_local`) ou até mesmo gerar arquivos dinamicamente (`write_text`).
-   [**Gerenciamento de Dependências**](./dependency-management.md): Explica como Kintsugi resolve recursivamente as dependências entre Shards, garantindo que tudo seja carregado na ordem correta.
-   [**Vases**](./vases.md): Um sistema para gerenciar assets grandes e imutáveis (como os arquivos base de um jogo) fora do Store principal, de forma eficiente e compartilhada.
-   [**Fluxo de Execução (Run Workflow)**](./run-workflow.md): Detalha como o Kintsugi usa tecnologias como OverlayFS para rodar uma build imutável permitindo, ao mesmo tempo, que o jogo salve arquivos e configurações de forma persistente.
-   [**O Interpretador**](./interpreter.md): Descreve o ambiente TypeScript e a API disponível para escrever as expressões do seu modpack.
-   [**Exemplo de Modpack**](./modpack-example.md): Um exemplo prático de pseudocódigo que demonstra como criar um modpack do zero.
