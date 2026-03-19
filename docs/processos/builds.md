# Builds

Cada vez que você executa `kintsugi build`, uma nova **build** é criada. Builds permitem:

- **Histórico**: Manter um histórico de todas as builds
- **Rollback**: Reverter instantaneamente para uma versão anterior
- **Testes**: Testar novas versões sem perder a versão atual

### Gerenciando builds

```bash
# Listar todas as builds
kintsugi modlist builds meu-modlist

# Reverter para uma build anterior
kintsugi modlist rollback meu-modlist 3
```

### Como detectar se algo já foi compilado?
Toda receita tem um atributo "out" que é o nome da entrada no store.
Ele deve verificar se alguma pasta dentro do store já possui esse nome. Caso sim, a entrada já foi compilada; caso não, ela deve ser compilada.

## Processo de build
O processo de build trabalha para fazer com que a receita gerada pelo processo de interpretação se torne uma entrada no store.
Após o executor executar o interpretador, ele receberá uma composição. Essa composição tem tudo que é necessário para montar a build, a nova versão da modlist atual.
Cabe ao compilador estruturar os arquivos dos shards e vases em uma entrada no store.
Esse processo é feito através da criação de **hard links** dos arquivos dos shards e vases de forma ordenada, como descrito nos layers da receita.
A prioridade é sempre pela do último. Isso seja, caso um link já exista, ele deve ser substituído pelo novo.
Após a entrada ser composta, um link simbólico é criado na pasta do modlist junto de um segundo link "active" que aponta para o mesmo lugar. Esse link "active" diz ao kintsugi que ela é a build atual.
O nome da entrada no store deve ser `[hash]-[nome do modlist]-[versão]` (versão sempre é incremental a partir de 1).

### Rollback
O kintsugi, devido à sua estrutura de imutabilidade, permite que uma build seja revertida para uma versão anterior (rollback). Esse processo muda o link "active" para a versão escolhida pelo usuário.
