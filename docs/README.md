# Documentação do Kintsugi

Bem-vindo à documentação do Kintsugi, um gerenciador de modlists para jogos declarativo, reproduzível e isolado, fortemente inspirado no [Nix](https://nixos.org/).

## Filosofia

O Kintsugi foi projetado com base em três princípios fundamentais:

-   **Declarativo:** Você descreve o estado final desejado do seu modlist, e o Kintsugi se encarrega de alcançar esse estado. Em vez de uma sequência de passos manuais ("instale o mod A, depois o mod B"), você simplesmente declara que seu modlist "contém os mods A e B".
-   **Reproduzível:** Uma build do Kintsugi é uma função pura de suas entradas. Qualquer pessoa, em qualquer máquina, com a mesma receita de modlist, produzirá uma instalação bit-a-bit idêntica.
-   **Isolado:** Cada build é autocontida e imutável, armazenada em um local dedicado (o "Store"). Isso permite manter múltiplas versões de um modlist, realizar testes sem risco e fazer rollbacks para uma versão anterior de forma instantânea.

## Arquitetura

O Kintsugi é composto por três componentes principais que trabalham em conjunto:

1.  **Interpretador** Responsável por executar as "expressões" do seu modlist — scripts TypeScript que definem quais mods, configurações e patches incluir. Ele traduz essas expressões em "receitas" JSON, que são instruções claras para o próximo componente.
2.  **Compilador:** O motor de construção do Kintsugi. Ele lê as receitas geradas pelo interpretador, baixa as fontes, executa scripts de patch, e monta a estrutura de arquivos final da sua build no Store. Ele é intencionalmente "burro", apenas seguindo as instruções da receita, o que o torna **completamente agnóstico ao jogo** — não importa se é Skyrim, Minecraft ou Factorio.
3.  **Executor:** A interface de linha de comando (`kintsugi`) que você usa para gerenciar suas modlists. Ele orquestra o trabalho do Interpretador e do Compilador e fornece comandos para `run` (rodar), `build` (construir), `gc` (coletar lixo), e mais.

O fluxo de trabalho básico é: **Expressão (TS) -> Receita (JSON) -> Build (diretório no Store)**.

O ponto principal do Kintsugi, seu compilador é que ele é "burro" não sabendo o que faz, somente seguindo a uma receita, isso permite que ele possa trabalhar com qualquer jogo, já que a logica e a forma de trabalhar é definida pelos arquivos de receitas gerados pelo interpretador, que por sua vez tem a flexibilidade para permitir isso.

O kintsugi é um programa espeficico de linux, usando as vantagems do sistema como overlays e namespaces.

## Diferenças entre outros modmanagers.
Mod Managers como ModOrganizer ou Vortex, são imperativos onde o usuario diz o que o modmanager deve fazer para a montagem da modlist, eles trabalham diretamente nos arquivos dos jogos (ou criando overlays como no caso do ModOrganizer), isso não permite uma flexibilidade, o Kintsugi por outro lado é declarativo, usando arquivos de definição, o usuario explica ao kintsugi como ele espera que o modlist seja é cabe ao kintsugi montar essa modlist da melhor maneira, baixando os arquivos, organizando os mods na ordem correta, gerenciando dependencias, criando arquivos de suporte, preparando o ambiente ideal para executar o jogo.
O sistema de builds do kintsugi permite que as modlists trabalhem de forma imutável e única, a cada processo de build o kintsugi gera uma versão idependente da sua modlist permitindo que você volte para uma versão anterior caso algo aconteça. a imutabilidade também permite que você tenha multiplas builds de multiplas modlists, ao invez de uma unica lista derenciada por perfils.
O kintsugi é focado em tentar ser o mais reprodutivel o possivel, o resultado da sua modlist deve ser o mesmo caso você faça builds em lugares diferentes com os mesmos arquvos de definições, sem necessidade de coisas como montar uma modlist do zero caso você formate o computador ou queira testar algo novo.

# Jogos Suportados
O Kintsugi é **agnóstico ao jogo**. O compilador não sabe nada sobre jogos específicos — ele apenas segue receitas. Isso significa que você pode gerenciar modlists para qualquer jogo.

Os exemplos desta documentação usam Skyrim SE como referência, mas o Kintsugi pode ser usado para:
- Minecraft (Java/Forge/Fabric)
- Factorio
- Stardew Valley
- Qualquer jogo com sistema de mods

## Pastas do sistema
O kintsugi vai armazenar seus arquivos em .kintsugi na home do usuario.
dentro haverá as seguintes pastas
.kintsugi/
  modlists/
  recipes/
  vases/
  store/

## Conceitos Fundamentais

Para entender como usar o Kintsugi, é importante conhecer seus blocos de construção:

-   [**Shards**](./shards.md): As unidades atômicas do Kintsugi. Um Shard é uma receita para produzir um conjunto de arquivos no Store, seja um mod, um patch de configuração ou a build final de um modlist.
-   [**Fontes (Sources)**](./sources.md): Mecanismos que o Kintsugi usa para obter conteúdo, como baixar de uma URL (`fetch_url`), copiar de um diretório local (`fetch_local`) ou até mesmo gerar arquivos dinamicamente (`write_text`).
-   [**Gerenciamento de Dependências**](./dependency-management.md): Explica como Kintsugi resolve recursivamente as dependências entre Shards, garantindo que tudo seja carregado na ordem correta.
-   [**Vases**](./vases.md): Um sistema para gerenciar assets grandes e imutáveis (como os arquivos base de um jogo) fora do Store principal, de forma eficiente e compartilhada.
-   [**Fluxo de Execução (Run Workflow)**](./run-workflow.md): Detalha como o Kintsugi usa tecnologias como OverlayFS para rodar uma build imutável permitindo, ao mesmo tempo, que o jogo salve arquivos e configurações de forma persistente.
-   [**O Interpretador**](./interpreter.md): Descreve o ambiente TypeScript e a API disponível para escrever as expressões do seu modlist.
-   [**builds**](./builds.md): Descreve como uma build deve ser feita
-   [**Garbage Collection**](./garbage-collector.md): processo de limpesa de shards não usados.
-   [**Store**](./store.md): O armazenamento dos Shards
