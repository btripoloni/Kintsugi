[Usuário roda `init`] -> [nova modlist gerada]

[Usuário roda `build`] -> [O executor envia o arquivo main.ts para o compilador] -> [arquivos de receita gerados pelo interpretador + caminho da composição] -> [compilador]

[Compilador lê a composição] -> [resolve as dependências] -> [monta o sistema de arquivos] -> [faz os links simbólicos]
Resolver as dependências: o Compilador deve olhar os mods que formam a composição e checar se eles já existem no store. Caso não, de forma síncrona, ele deve passar por cada receita adquirindo os arquivos definidos pela source e fazendo os builds. Depois que tudo estiver certo, a montagem do sistema de arquivos pode começar.

[Usuário roda 'run'] -> [sistema overlayFS é montado] -> [kintsugi olha dentro do overlay buscando pelo manifesto de execução] -> [usando as instruções ele executa o jogo]
