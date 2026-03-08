# builds

Each time you run `kintsugi build`, a new **build** is created. builds allow:

- **History**: Keep a history of all builds
- **Rollback**: Instantly revert to a previous version
- **Testing**: Test new versions without losing the current version

### Managing builds

```bash
# List all builds
kintsugi modlist builds my-modlist

# Rollback to a previous build
kintsugi modlist rollback my-modlist 3
```

### Como detectar se algo já foi compilado?
Toda receita vai tem um atributo "out" esse atributo é o nome da entrada no store.
ele deve olhar se alguma pasta dentro do store já possue esse nome caso sim, a entrada já foi compilada, caso não, ela deve ser compilada.

## Processo de build
O processo de build trabalha para fazer com a receita gerada pelo processo de interpretação se torne uma entrada no store.
Apos o executor executar o interpretador, ele ira receber uma composição, essa composição tem tudo que é necessario para montar a build, a nova versão da modlist atual.
Cabe ao compilador estruturar os arquivos dos shards e vases em uma entrada no store.
esse processo é feito atravez da criação de **hard links** dos arquivos dos shards e vases em forma ordena como é descrito nos layers da receita.
A prioridade e sempre pela do ultimo. isso seja, caso um link já exista, ele deve ser substituido pelo novo.
Apos a entrada ser composta, um link simbolico é criado na pasta do modlist junto de um segundo link "active" que a aponta para o mesmo lugar, esse link "active" diz ao kintsugi que ela é a build atual.
O nome da entrada no store deve ser [hash]-[modlist name]-[version] (version sempre é incremetal apartir de 1)

### Roolback
O kintsugi devido a sua estrutura de imutabilidade permite que uma build seja revertida para uma versão anterior(rollback) esse processo muda o link "active" para a versão escolhida pelo usuario.