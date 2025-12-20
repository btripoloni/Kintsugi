# Projeto: Mod-Manager Declarativo

## 1. Introdução e Filosofia

Este documento descreve a arquitetura de um mod manager de jogos tanto nativos quanto usando wine para Linux, usando o conceito de declaração para permitir a geração de modpacks imutaveis e reprodutíveis.
Esse mod manager é altamente inspirado no nix e nixos. pensado que cada modpack seja um projeto independente que contem builds isoladas e imutaveis, permitindo testes e rollbacks.

Pontos do projeto:
-   **Declarativo:** O estado final é definido, não os passos manuais.
-   **Reproduzível:** Builds são funções puras dos inputs.
-   **Isolado:** Gerações autocontidas e imutáveis.

O conteudo dos modpacks (mods, arquivos de configuração, versões do jogo, dependencias, etc.) é guardado no store, guardado por uma hash256, garantindo que o mesmo conteudo não seja duplicado.
Dentro do store ficarão, não somente os mods, mas também as gerações resultantes, arquivos de configuração e arquivos base dos jogos.
Vamos chamar isso de derivações, toda derivação é um arquivo ou conjunto de arquivos dentro do store;
Um banco de dados sqlite ajudara a guardar as hashs informações relacionadas a derivações e builds.

# Partes do mod manager
## Expressões
Um codigo em typescript que define o conteudo de um modpack, similar as expressões do nix.
Dentro das expressões, tudo relacionado ao funcionamento do modpack é declado.
Mods, arquivos de configuração, versões do jogo, dependencias, etc. 
A execussão desse codigo gera um arquivo json que descreve instruções de build.
Expressões são feitas a partir de um conjunto de funções prontas que podem ser combinadas e extendidas para formar modulos que podem ser reutilizados, para formar modpacks de forma pratica.

## instruções de Build
Um arquivo json que descreve instruções de build, nele todos os paços necessarios para fazer a build de um projeto é descrito, esse arquivo é lido pelo compositor e usado para gerar a ultima build de um projeto.

## Compositor
O compositor é um programa que executa as operações de build de forma sequencial.
Ao receber um arquivo de instruções de build, ele executa essas operações de forma sequencial.
Ele é o responsalvel por resolver as dependencias, escrever as configurações, gerenciar os arquivos dos jogos, gerenciar o store e fazer os links simbolicos para gerar a build.

Store, databases, e gerações dos projetos devem ter um local dentro da pasta do usuario.
Uma build não deve ser feita com direitos de administrador.
Todos os arquivos de terceiros não gerados pelo composer devem ter uma string de hash256, para que possa ser verificado se o conteudo é o mesmo do que foi gerado.
Caso algum desses arquivos não tenha uma hashs256 o build deve alertar que não foi informado uma hash e parar a build, o que ja foi feito no caso de links simbolicos deve ser eliminado.
Caso a hash256 informada não corresponda ao conteudo do arquivo, o build deve alertar que a hash informada não corresponde ao conteudo do arquivo, então deve parar a build, e informar qual foi a hash gerada pelo compositor. o que já foi gerado daquela build, exceto arquivos do store devem ser eliminados.
Tudo que for gerado pelo compositor deve ser feito em uma pasta temporaria, que será movida para dentro do store quando o build for completo.

Exemplo de instruções de build:
```json
{
    "game": "minecraft",
    "version": "1.20.1",
    "hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "location": "/", // no caso isso significa que os arquivos do jogo devem ser colocados na raiz da pasta do build (que quando o build for completo sera movido para o store)
    "pre-build": "", // to games like minecraft, run some commands to install mod loader is needed
    "build":[
        {
            "name": "modname",
            "version": "1.0.0",
            "hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "src": {
                "resolver": "curseforge",
                "id": "123456",
                "version": "1.0.0"
            },
            "location": "/mods/"
        }
    ]
}
```

```json
{
    "game": "skyrimse",
    "version": "1.16.171",
    "hash": "sha256:45ad45asf4d5fa4das4df4fg45h4as4fbgr5t",
    "location": "/", // no caso isso significa que os arquivos do jogo devem ser colocados na raiz da pasta do build (que quando o build for completo sera movido para o store)
    "build":[
        {
            "name": "skse",
            "version": "1.0.0",
            "hash": "sha256:123456as4df4dv4fg4gh4cc67890abcdef1234567890abcdef",
            "src": {
                "resolver": "url",
                "url": "https://example.com/skse-1.0.0.zip",
                "version": "1.0.0"
            },
            "location": "/"
        }
        {
            "name": "modname",
            "version": "1.0.0",
            "hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "src": {
                "resolver": "nexus",
                "id": "123456",
                "version": "1.0.0"
            },
            "location": "/"
        }
    ],
    "run": [ // parte dedicada a rodar programas que irão gerar arquivos de configuração e etc.
      {
        "name":"nemesis",
        "version":"1.0.0",
        "hash":"sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "src": {
          "resolver": "url",
          "url": "https://example.com/nemesis-1.0.0.zip",
          "version": "1.0.0"
        },
        "location": "/",
        "enviroment": [ 
            // hashs de todos as derivações que serão necessarios para criar um ambiente.
            // isso sera rodado depois de que o a parte de build for executada para que todos as derivações ja estejam no store.
            // essas derivações serão criadas, junto com o jogo para formar um ambiente somenete com o necessario para rodar o programa para gerar a aplicação.
            // os arquivos gerados pelo programa serão capturados pelo upperlayer e uma nova derivação será criada.
            // a derivação ira para o topo do sistema de camadas.
        ],
        "command": "nemesis.exe",
        "args": ["--arg1", "value1", "--arg2", "value2"],
        "env": {
          "VAR1": "value1",
          "VAR2": "value2"
        }
      }
    ]
}
```

A formação de uma build, cada build será feita compondo o arquivo do jogo mais os arquivos de derivação do store em um sistema de camadas.
A camada mais baixa sera a do jogo, enquanto as posteriores serão as derivações e arquivos gerados pela build, como configurações e etc.
o resultado final deve ser uma pasta com links simbolicos para os arquivos do jogo e as derivações.
alem de ser guardado os dados para que seja possivel fazer rollbacks e rodar a ultima build.