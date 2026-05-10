# Diário de Implementação: Comando `modlist`

Este documento registra a lógica, a estrutura e o propósito da implementação do comando `modlist` no Kintsugi CLI.

## 1. Motivação
Anteriormente, o Kintsugi permitia inicializar (`init`), construir (`build`) e executar (`run`) modlists, mas não havia uma forma centralizada de gerenciar as modlists que já haviam sido construídas e armazenadas no diretório raiz (`~/.kintsugi/modlists`). O comando `modlist` preenche essa lacuna, permitindo listagem, inspeção e limpeza.

## 2. O que foi feito
Foram criados três componentes principais:

### A. Store de Modlists (`apps/cli/src/store/modlist.ts`)
Camada de abstração para o sistema de arquivos.
- **`listModlists`**: Escaneia o diretório `modlists` em busca de pastas.
- **`getModlistInfo`**: Lê o arquivo `modlist.json` dentro da pasta da modlist para obter metadados (versão, ambiente).
- **`getActiveComposition`**: Resolve o link simbólico `active` para identificar qual build (composição) está atualmente vinculada àquela modlist.
- **`removeModlist`**: Remove recursivamente o diretório da modlist.
- **`getBuildHistory`**: Lê o arquivo `history.json` que registra o histórico de builds (hashes e timestamps).
- **`addBuildToHistory`**: Registra uma nova build no histórico.
- **`switchActiveBuild`**: Atualiza o link simbólico `active` para apontar para um hash específico no `store`.

### B. Handler de Comando (`apps/cli/src/commands/modlist.ts`)
Lógica de interface de linha de comando.
- Implementa subcomandos `list` (ou `ls`), `info` e `remove` (ou `rm`).
- **Novo**: Implementa subcomandos de build:
    - `build list`: Mostra o histórico de hashes com timestamps, indicando o ativo com um `*`.
    - `build rollback`: Volta para a build imediatamente anterior no histórico.
    - `build switch <hash>`: Alterna para um hash específico presente no histórico.
- Gerencia o argumento `--root` para permitir o uso de diretórios Kintsugi customizados.
- Fornece mensagens de ajuda específicas para o comando.

### C. Integração CLI (`apps/cli/src/main.ts` e `apps/cli/src/commands/build.ts`)
- Registro do comando no roteador principal.
- **Novo**: O comando `kintsugi build` agora chama `addBuildToHistory` ao finalizar com sucesso, garantindo que cada nova build seja rastreável.

## 3. Como foi feito (Lógica de Implementação)
A implementação seguiu o padrão de design modular do Kintsugi:
1. **Separação de Preocupações**: A lógica de IO (Store) está separada da lógica de apresentação (Command).
2. **Resiliência**: Funções como `listModlists` e `getModlistInfo` tratam erros silenciosamente ou retornam valores nulos/vazios para evitar crashes quando a estrutura de pastas não está perfeita.
3. **Compatibilidade com Nix**: A verificação e execução foram feitas dentro do `nix develop` para garantir que as dependências do Deno e do ambiente estivessem corretas.

## 4. Como usar

### Listar modlists instaladas
```bash
kintsugi modlist list
```

### Ver detalhes de uma modlist (metadados e build ativo)
```bash
kintsugi modlist info <nome-da-modlist>
```

### Remover uma modlist do sistema
```bash
kintsugi modlist remove <nome-da-modlist>
```

## 5. Notas para o Futuro (Diário)
- **Integração com `switch`**: Atualmente, o `getActiveComposition` apenas lê o link simbólico. No futuro, um comando `kintsugi modlist switch` poderia ser adicionado para trocar o link `active` entre diferentes composições existentes no `store`.
- **Validação de Integridade**: Poderia ser adicionado um subcomando `check` para verificar se os arquivos da composição apontada pelo link `active` ainda existem no `store`.
- **Interface**: A listagem atual é simples. Se o número de modlists crescer muito, podemos considerar uma tabela formatada.
