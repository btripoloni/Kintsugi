As receitas são um ponto crucial de como o kintsugi trabalha, elas são similares as derivações do nix.
elas são o resultado da interpretação do arquivo main.ts, quando esse arquivo é executado ele deve retornar um objeto javascript com as receitas e composições.
cabe então ao interpretador, receber esse json e separar salvando os arquivos json dentro da pasta recipes.

# Hashes 
Para garantir que todas as builds foram executadas, no processo de interpretação, cada objeto de receita tem um atributo chamado "out" com um padrão de nome [sha-256]-[nome]-[versão]
a hash é trucada para 32 caracteries para ficar mais legivel.

Uma hash não é gerada pelo compilador ou executor, esse trabalho é do interpretador.
A geração de hash se é feita apartir da texto receita, isso garante que qualquer mudança minima gere receitas diferentes e modlists que usem a mesma dependencia usem as mesmas receitas diminuindo tempo de compilação.

As receitas tendem a ser auto explicativas, mas alguns pontos devem ser levados em consideração.
"out" é o nome de todas as receitas, elas contem o hash, nome e versão do um mod.
o compilador vai user esse nome para criar as entradas no store, e não tentar gerar algo novo.
o compilador só deve gerar hashs quando é relacionado a downloads, quando uma source tem um campo 'sha256'(não trucado) isso significa que ele deve comparar o zip baixado com a hash fornecida para garantir integridade.