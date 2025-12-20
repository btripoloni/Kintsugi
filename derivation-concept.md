# Conceito: Arquitetura baseada em Derivações (Input-Addressed)

**Restrição Principal:** O Orquestrador (TS) gera o plano **SEM** ler arquivos do disco. Ele opera apenas com metadados e lógica.

## 1. O Identificador Único (Derivation Hash)

Como o Orquestrador sabe o caminho de saída `/store/<hash>` sem ler o arquivo?
Calculando o hash da **Instrução** (A própria Derivação), e não do **Conteúdo**.

### Fórmula
`DrvHash = SHA256( JSON( { op, params, env, inputDrvs } ) )`

### Exemplo Prático

#### Passo A: Importar Arquivo Local
O Orquestrador cria a instrução.
```json
{
  "op": "fetch_local",
  "params": { "path": "/home/user/meu-mod.zip" }
}
```
O Orquestrador calcula o SHA256 **deste JSON**. Digamos que seja `abc123...`.
O Orquestrador define: *"O output deste passo será criado em `/store/abc123...-fetch_local/`"*.

**Nota:** Se o *conteúdo* de `meu-mod.zip` mudar, o hash da instrução continua o mesmo. Isso é resolvido pelo Compositor limpando o output antigo ou verificando mtime (detalhe de implementação do Runtime), mas para o **Grafo**, a identidade é a instrução.

#### Passo B: Extrair
O Orquestrador cria a instrução que depende do Passo A.
```json
{
  "op": "extract",
  "params": { 
     "file": "/store/abc123...-fetch_local/meu-mod.zip" 
  },
  "inputDrvs": { "abc123...": ["out"] }
}
```
Novamente, calcula o SHA256 deste novo JSON -> `def456...`.
Output previsto: `/store/def456...-extract/`.

## 2. E os Downloads (Nexus/Steam)?

Para downloads, queremos que o hash seja universal (para cache compartilhado).
Aqui usamos o **Lockfile**.

1.  O comando `mod-manager add` (que pode ter acesso a rede/disco em um momento separado) salva o hash do arquivo no `project.lock.json`.
2.  O Orquestrador lê o `project.lock.json`.
3.  Ele cria uma instrução `fetch_url` injetando esse hash conhecido nos parametros:
    ```json
    { "op": "fetch_url", "params": { "url": "...", "algo": "sha256", "hash": "known_hash_from_lock" } }
    ```
4.  O `DrvHash` dessa instrução inclui o hash do conteúdo. Logo, o caminho no store será único e verificável.

## 3. Fluxo Final

1.  **Orquestrador:**
    *   Lê `mods.json` e `lockfile`.
    *   Monta o grafo de objetos JSON na memória.
    *   Para cada objeto, calcula o Hash do JSON.
    *   Usa esse Hash para substituir referências em objetos dependentes.
    *   Emite um arquivo `plan.json` contendo um mapa plano: `Hash -> Objeto Derivação`.

2.  **Compositor:**
    *   Recebe `plan.json`.
    *   Para cada Hash no mapa:
        *   Verifica se `/store/<Hash>` existe e está válido.
        *   Se não, executa a instrução.
