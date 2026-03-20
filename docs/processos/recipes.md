# Receitas
As receitas são um ponto crucial de como o kintsugi trabalha. Elas são similares às derivações do nix.
Elas são o resultado da interpretação do arquivo `main.ts`. Quando esse arquivo é executado, ele deve retornar um objeto JavaScript com as receitas e composições.
Cabe então ao interpretador receber esse JSON e separar, salvando os arquivos JSON dentro da pasta `recipes`.

**Parametros**
- `out: string`: o nome a ser usado na receita.
- `src: object`: objeto a ser usado como uma source mais em ../conceitos/sources.md
- `post_build: string`: script em bash a ser rodado apos a source ser adquirida.

# Hashes
Para garantir que todas as builds foram executadas, no processo de interpretação, cada objeto de receita tem um atributo chamado "out" com um padrão de nome `[sha-256]-[nome]-[versão]`.
O hash é truncado para 32 caracteres para ficar mais legível.

Uma hash não é gerada pelo compilador ou executor; esse trabalho é do interpretador.
A geração de hash é feita a partir do texto da receita. Isso garante que qualquer mudança mínima gere receitas diferentes e que modlists que usem a mesma dependência usem as mesmas receitas, diminuindo o tempo de compilação.

As receitas tendem a ser autoexplicativas, mas alguns pontos devem ser levados em consideração:
- "out" é o nome de todas as receitas; elas contêm o hash, nome e versão de um mod.
- O compilador vai usar esse nome para criar as entradas no store e não tentar gerar algo novo.
- O compilador só deve gerar hashes quando é relacionado a downloads. Quando uma source tem um campo 'sha256' (não truncado), isso significa que ele deve comparar o zip baixado com a hash fornecida para garantir integridade.

# Exemplo de uma receita.
```json
{
  "out":"[hash]-[nome da receita]-[versão]",
  "src": {
    "type": "url",
    "sha256": "",
    "unpack": "",
    "method": "",
    "cookies": "",
    "body": ""
  },
  "dependencies": [
    // uma lista com os nomes de todas as receitas que são dependencias e devem ser compiladas antes.
  ],
  "post_build": ""

}
```