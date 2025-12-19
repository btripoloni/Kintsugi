# Arquitetura da Máquina de Estados do Compositor

A execução do script de build JSON pelo Compositor em Go pode ser modelada de forma elegante e robusta usando um padrão de **Máquina de Estados** (State Machine). Essa abordagem fornece uma estrutura clara para processar uma lista sequencial de operações, onde o resultado de um passo pode ser a entrada para o próximo.

## Componentes da Máquina de Estados

Nossa máquina de estados é definida por três componentes principais: o Estado, as Transições e as Ações.

### 1. O Estado (State)

Diferente de uma máquina de estados simples que pode estar em um estado como `IDLE` ou `RUNNING`, o "Estado" em nosso Compositor é o **conjunto cumulativo de todos os resultados dos passos (`steps`) que já foram executados com sucesso**.

-   **Estrutura de Dados:** O Estado pode ser representado como um mapa (dicionário), onde a chave é o `id` de um passo (definido no JSON) e o valor é o `Resultado` daquele passo.
-   **Exemplo de Resultado:** O resultado de uma operação `resolve` seria o caminho para o artefato no Store (ex: `/path/to/store/<hash>-skyui/`). O resultado de `run_tool` seria o caminho para os arquivos gerados, também no Store.
-   **Imutabilidade:** O estado é efetivamente imutável *durante* a execução de um passo. Ele só é atualizado após a conclusão bem-sucedida de uma Ação, garantindo que cada passo opere em uma base de resultados estável e conhecida.

### 2. As Transições (Transitions)

Uma **Transição** é o ato de processar um único `step` do array `steps` no script JSON.

-   **Linearidade:** Como nosso script é uma lista ordenada, as transições ocorrem de forma linear e previsível, do primeiro ao último passo.
-   **Processo:** A máquina de estados consome o `step` atual e o `Estado` atual para produzir um `Estado` novo e atualizado. Por exemplo, ao processar um passo `resolve` com `id: "skyrim_files"`, a máquina transiciona de um estado que não contém `"skyrim_files"` para um que contém.

### 3. As Ações (Actions)

Uma **Ação** é a função em Go que implementa a lógica de uma `op` específica.

-   **Dispatch:** O loop principal da máquina de estados lê o campo `op` do `step` atual (ex: `"resolve"`, `"compose"`) e despacha a execução para a função Go correspondente (`handleResolve`, `handleCompose`).
-   **Entradas:** Cada função de Ação recebe os parâmetros do `step` atual e acesso de leitura ao `Estado` atual para buscar os resultados de passos anteriores (suas dependências).
-   **Saídas:** Se a Ação for bem-sucedida, ela retorna um `Resultado` que será usado para atualizar o estado. Se falhar, ela retorna um erro que interrompe a execução de toda a máquina de estados.

## Fluxo de Execução da Máquina

O processo de execução de um build pelo Compositor segue um ciclo de vida claro:

1.  **Inicialização:** A máquina é iniciada com um `Estado` vazio (um mapa vazio).
2.  **Iteração:** A máquina começa a iterar através do array `steps` do script JSON, um passo de cada vez.
3.  **Validação de Dependências:** Para cada `step`, a máquina primeiro verifica se todas as suas dependências (referenciadas em campos como `use_step`) já existem como chaves no mapa de `Estado` atual. Se uma dependência não for encontrada, o build falha imediatamente com um erro claro, pois a ordem do script está incorreta ou um passo anterior falhou.
4.  **Execução da Ação:** Se a validação for bem-sucedida, a máquina de estados invoca a Ação (função Go) correspondente à `op` do `step`, passando os parâmetros necessários.
5.  **Atualização do Estado:** Se a Ação for concluída com sucesso e o `step` tiver um `id`, seu `Resultado` é adicionado ao mapa de `Estado`. A máquina agora está em um novo estado, pronta para o próximo passo.
6.  **Conclusão ou Falha:** O ciclo se repete até que todos os `steps` tenham sido executados (resultando em um build bem-sucedido) ou até que uma Ação retorne um erro (resultando em uma falha de build).

## Vantagens desta Abordagem

-   **Clareza e Estrutura:** O código do Compositor se torna altamente estruturado e fácil de entender, com um loop principal simples e responsabilidades bem definidas.
-   **Validação Robusta:** A verificação de dependências antes de cada passo previne erros em tempo de execução e fornece feedback imediato sobre scripts malformados.
-   **Gerenciamento Centralizado de Resultados:** O `Estado` atua como uma fonte única da verdade para todos os resultados intermediários, simplificando a lógica das Ações.
-   **Resiliência e Testabilidade:** Cada Ação pode ser testada de forma isolada, dado um `Estado` de entrada e verificando seu `Resultado` de saída.
-   **Potencial para Resumo de Builds:** Esta arquitetura abre a porta para, no futuro, persistir o `Estado` em disco. Isso permitiria que um build longo que falhou no meio do caminho fosse resumido de onde parou, economizando tempo.
