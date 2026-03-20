# Interpretador

O interpretador é responsável por executar as expressões TypeScript e gerar receitas JSON para o compilador.

## 1. Visão Geral
O interpretador usa deno como runtime executando um arquivo Typescritp, o resultado dessa execussão sempre deve ser um json.

Então cabe ao interpretador que recebe o resultado dessa execussão transformar o resultado em arquivos de receita.

## 2. Entrada e Saída

**Entrada:**
- Caminho para o arquivo typescript a ser executado normalmente nomeado como `main.ts`

Importante que caso a pasta que contem o arquivo a ser executado, contenha um arquivo `deno.json` ele deve garantir que as dependencias sejam supridas antes da execussão, o padrão é `main.ts`

**Saída:**
- Arquivos JSON em `~/.kintsugi/recipes/[hash]-[nome da receita]-[versão].json`
- Retorna hash da receita raiz para stdout

### Exemplo de json
```json
{
  "root":"[hash]-[nome da receita]-[versão]",
  "recipes": [
    {
      "out": "[hash]-[nome da receita]-[versão]",
      "src": {
      "type": "build",
      "source": "build",
      "layers": [ // Ordem das camadas
          "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
          "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
          "0841c53c2c1377ecdcd5e68ef52c7ac4-skse-2.2.6",
      ]
      },
      "dependencies": [ // Define o que essa composição vai usar
      "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
      "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
      "0841c53c2c1377ecdcd5e68ef52c7ac4-skse-2.2.6",
      ]
    },
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
      "post_build": ""
    }
  ]
}
```

### Workflow do interpretador
1. O interpretador recebe o arquivo e o executa.
2. Ao receber o resultado o interpretador salva as receitas na pasta de receitas usando o atributo "out" como nome do arquivo.
3. o interpretador retorna o nome da receita raiz que o compilador usa como ponto de partida o atributo "root"

## 2.1 Workflow do Usuário
1. Usuário roda `kintsugi init meu-modlist`.
2. O sistema cria `~/.kintsugi/modlists/meu-modlist/` contendo `modlist.json` e `main.ts`.
3. Usuário edita `main.ts` para definir o modlist.
4. Usuário roda `kintsugi build` dentro da pasta.
5. O executor roda o interpretador sobre o arquivo `main.ts`.

## Receitas.
Receitas são um conjunto de instruções que serão passadas para o compilador, mais informações em ./recipes.md

