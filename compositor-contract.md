# Compositor JSON Contract Specification (v4)

Este documento detalha o formato exato do JSON esperando pelo **Compositor v4**. Este JSON é gerado pelo Orquestrador (TypeScript) e consumido pelo Agendador (Go).

## 1. Estrutura Raiz

O arquivo de entrada deve conter um objeto raiz `Spec`.

```json
{
  "steps": [
    // Lista de Steps
  ]
}
```

## 2. Estrutura do Step

Cada operação no grafo é um `Step`.

```json
{
  "id": "unique_step_id",
  "op": "operation_name",
  "params": {
    // Parâmetros específicos da operação
  },
  "use_step": [
    "dependency_step_id_1"
  ]
}
```

-   **`id`** (string): Identificador único do step no grafo. Usado em `use_step`.
-   **`op`** (string): Nome da primitiva a ser executada.
-   **`params`** (object): Argumentos para a operação. Variam conforme o `op`.
-   **`use_step`** (array of strings, opcional): Lista de IDs de steps que devem ser concluídos antes deste. **Nota:** O Compositor usa isso para garantir a ordem de execução e (futuramente) para resolver caminhos relativos de outputs.

---

## 3. Primitivas Implementadas

### 3.1. `fetch_local`

Importa um arquivo do sistema de arquivos local para o Store. Útil para desenvolvimento ou instalação manual.

-   **Fase:** Fetch (Rede/IO) - *Execução Sequencial*
-   **Inputs:** N/A (Raiz)
-   **Params:**
    -   `path` (string): Caminho absoluto para o arquivo no host.

```json
{
  "id": "fetch_my_mod",
  "op": "fetch_local",
  "params": {
    "path": "/home/user/downloads/my-mod.zip"
  }
}
```

### 3.2. `extract`

Descompacta um arquivo (atualmente apenas `.zip`) de um step anterior.

-   **Fase:** Build (CPU) - *Execução Paralela*
-   **Inputs:** Requer que o arquivo fonte esteja disponível (normalmente via dependência de um fetch).
-   **Params:**
    -   `file` (string): Caminho absoluto* para o arquivo a ser extraído.
    -   *Nota: Atualmente, o integrador deve resolver o caminho do arquivo no Store. Futuramente, poderá ser relativo ao output de um `use_step`.*

```json
{
  "id": "unzip_mod",
  "op": "extract",
  "params": {
    "file": "/store/sha256...-fetch_my_mod/my-mod.zip"
  },
  "use_step": ["fetch_my_mod"]
}
```

### 3.3. `copy`

Copia arquivos ou diretórios de um local para o output do step atual.

-   **Fase:** Build (CPU) - *Execução Paralela*
-   **Params:**
    -   `source` (string): Caminho absoluto de origem (arquivo ou pasta).
    -   `destination` (string): Caminho relativo ao diretório de output deste step.

```json
{
  "id": "copy_config",
  "op": "copy",
  "params": {
    "source": "/store/sha256...-unzip_mod/config.ini",
    "destination": "GameData/config.ini"
  },
  "use_step": ["unzip_mod"]
}
```

### 3.4. `compose`

Cria a árvore final de arquivos usando links simbólicos (Symlinks). Esta é geralmente a etapa final para gerar uma "Geração".

-   **Fase:** Build (CPU) - *Execução Paralela*
-   **Params:**
    -   `mapping` (map[string]string): Um objeto mapeando `Origem -> Destino`.
        -   `Key` (Origem): Caminho absoluto do arquivo/diretório original no Store.
        -   `Value` (Destino): Caminho relativo dentro da Geração final.

```json
{
  "id": "final_generation",
  "op": "compose",
  "params": {
    "mapping": {
      "/store/sha256...-unzip_mod/Data": "Data",
      "/store/sha256...-copy_config/GameData/config.ini": "Data/config.ini"
    }
  },
  "use_step": ["unzip_mod", "copy_config"]
}
```

---

## 4. Notas Técnicas

1.  **Imutabilidade:** Todos os inputs (em `params`) devem apontar para locais imutáveis (Store) ou controlados.
2.  **Determinismo:** O hash do Step (ID do Store) é calculado com base nos campos `op`, `params` e `use_step`. Qualquer alteração nestes campos gera um novo Output Path.
3.  **Segurança:** Caminhos de destino (`destination`, valores do `mapping`) não podem subir na árvore de diretórios (ex: `../` não permitido se sair do escopo do output).
