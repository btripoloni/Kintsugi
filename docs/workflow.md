[Usuario roda `init`] -> [nova modlist gerada]

[Usuario roda `build`] -> [O executor envia o arquivo main.ts para o compilador ] -> [arquivos de receita gerados pelo interpretador + caminho da composição] -> [compilador]

[compilador lê a composição] -> [resolve as dependendias] -> [monta o sistema de arquivos] -> [faz os links simbolicos]
Resolver as dependencias: o Compilador deve olhar os mods que formam a composição e checar se eles já existem no store, caso não, de forma sincronica, ele deve passar por cada receita adquirindo os arquivos definidos pela source e fazendo os builds, depois que tudo estiver certo o a montagem do sistema de arquivos pode começar.

[usuario roda 'run' ] -> [sistema overlayFS e montado] -> [kintsugi olha dentro do overlay buscando pelo manifesto de execussão] -> [usando as instruções ele executa o jogo]

