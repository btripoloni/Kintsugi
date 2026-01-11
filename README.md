# Kintsugi - A declarative Mod Manager

> ![warning]
> Esse Projeto é Altamente experimental, todo o código no momento é uma prova de conceito.
> O Projeto apesar de estar com seu codigo funcionando, bugs podem, e provavalmente vão acontecer nesse estagio.
> Alem disso as definições de pacotes e o design do projeto podem mudar fazendo com que modpacks quebrem.

Kintsugi é um mod manager que segue uma abordagem diferente, ele tem o objetivo de ser declarativo, imutavel e reprodutivo.
Esse projeto é altamente inspirado na forma como o Nix gerencia e constroi projetos, mas pensado para a modificação de arquivos de jogos.
Usando arquivos typescript o usuario pode declarar todos pontos necessarios em um modpack, versões especificas de um jogo, modloaders, mods que serão usados, arquivos de configuração, e qualquer outra necessidade que um jogo possa ter.
Enquanto um compilador usando GO lê arquivos arquivos de receita gerados apartir do typescript para compilar o modpack resultando em uma build isolada e pronta para jogar.

### Declarativo.
Dessa forma você não diz ao mod manager o que ele deve fazer ou como ele deve fazer alguma ação para formar seu modpack, você deve declarar o que é esperado de um novo modpack e cabe ao Kitsugi o trabalho de fazer isso da melhor forma, tornando a criação de modpacks algo mais produtivo e menos repetitivo.

### Imutavel.
O Kitsugi trabalha gerando builds do seu modpack assim como o Nix faz com o NixOS, permitindo que você possa fazer rollbacks para builds anteriores caso alguma alteração no seu modpack tenha quebrado a build atual de alguma forma, perfeito para aqueles momentos onde você quer jogar, mas alguma das recentes alterações que você fez está quebrando seu jogo, mas você não sabe examente o qual delas.
O kintsugi usa uma store e hard links para gerenciar os pacotes, formar as builds, e economizar armazenamento, mais sobre isso a frente nesse documento.

### Reprodutivel.
Apesar da dificuldade, o Kintsugi tenta ao maximo garantir que todos os pontos de um modpack sejam reprodutiveis, gerenciando todos os aspectos quem compoem um modpack como o jogo e sua versão, a mods, configurações e ferramentas.

# Gerenciamento de pactoes(em estado inicial)





## Componentes.
Kintsugi é composto de 3 componentes separados mas que trabalham em conjunto para o gerenciamento e criação de modspacks.

### Interpretador.
O interpretador, um instancia do Deno roda um arquivos typescript que definem como deve ser a compilação de um modpack, tudo deve ser definido dentro dos arquivos que serão lidos pelo interpretador, a execussão desse codigo ira resultar em arquivos de receitas que serão lidas pelo compilador no proximo passo.

### Compilador.
O compilador tem o objetivo de criar uma buid de um modpack para um jogo, ele é burro, isso significa que ele vai executar as instruções dos arquivos de receita de forma automatica e sem questionamentos, se preoculpando somente se ele tem tudo que necessario para executar suas instruções.

### Executor.
O Executor de certa forma é o maestro, ele tem o trabalho de iniciar novos modpacks, ordenar que o interpretador gere novas receitas, entregalas ao compilador quando prontas, gerenciar e executar os modpacks, alem de cuidar de outros aspectos do modmanager como o garbage collector.



