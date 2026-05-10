# Análise Completa do Código Kintsugi

## Visão Geral

Após ler toda a documentação em `docs/` e o código-fonte em `src/`, identifiquei várias implementações que **fazem sentido** dentro do escopo do projeto, mas também encontrei **inconsistências, funções faltantes e alguns problemas de implementação**.

---

## ✅ O Que Está Correto e No Escopo

### 1. Arquitetura Geral (Correto)

A arquitetura de 3 componentes está bem implementada conforme a documentação:
- **Interpretador** → Gera receitas JSON a partir de expressões TypeScript
- **Compilador** → Baixa fontes e compõe builds no Store
- **Executor** → Executa jogos com OverlayFS

### 2. Sistema de Hashing Determinístico (Correto)

O arquivo `src/interpreter/src/lib/hash.ts` implementa corretamente:
- Geração de hash SHA-256 para Derivações
- Ordenação recursiva de chaves para garantir determinismo
- Formato `[hash]-[name]-[version]` conforme especificado

Os testes em `src/interpreter/tests/hash_test.ts` cobrem:
- ✅ Determinismo (mesma entrada = mesmo hash)
- ✅ Diferentes entradas = diferentes hashes
- ✅ Formato correto do output
- ✅ Inclusão de dependências no cálculo
- ✅ Ordenação de chaves não afeta o hash

### 3. Resolução de Dependências (Correto)

O arquivo `src/interpreter/src/lib/modpack.ts` implementa:
- DFS com detecção de ciclos
- Ordenação topológica
- Deduplicação de dependências

Os testes em `src/interpreter/tests/resolver_test.ts` são abrangentes:
- ✅ Dependência linear simples
- ✅ Diamond dependency (grafos complexos)
- ✅ Detecção de ciclos (lança erro)
- ✅ Múltiplos roots independentes
- ✅ Nó único
- ✅ Lista vazia
- ✅ Dependência compartilhada aparece apenas uma vez

### 4. Sources do Compilador (Parcialmente Correto)

| Source | Status | Observação |
|--------|--------|------------|
| `url` | ⚠️ Parcial | Descompactação não implementada |
| `local` | ✅ Correto | Implementação simples e funcional |
| `composition` | ⚠️ Tem bug | Usa hard links em vez de symlinks conforme docs |
| `json` | ✅ Correto | Escreve arquivos JSON |

### 5. Executor (Correto)

O arquivo `src/core/executor/executor.ts` implementa:
- ✅ Configuração de diretórios overlay (upper, work, merged)
- ✅ Montagem com fuse-overlayfs
- ✅ Execução nativa
- ✅ Execução UMU (Wine/Proton)
- ✅ Variáveis de ambiente (KINTSUGI_ROOT, WINEPREFIX)
- ✅ Limpeza (unmount)

### 6. CLI - Comandos Implementados

| Comando | Status |
|---------|--------|
| `init` | ✅ Funciona corretamente |
| `run` | ✅ Funciona corretamente |
| `compile` | ✅ Funciona parcialmente |

---

## ❌ Problemas e Inconsistências Encontradas

### 1. **Escopo Divergente: Comandos CLI Faltantes**

A documentação menciona vários comandos que **não existem no código**:
- `kintsugi build` - Não existe
- `kintsugi gc` (garbage collection) - Não existe
- `kintsugi switch` - Não existe
- `kintsugi modlist` - Não existe

O comando `compile` existe mas a documentação não menciona ele diretamente (menciona `build`).

### 2. **Bug: Composition usa Hard Links em vez de Symlinks**

Em `src/compiler/src/sources/composition.ts:25`:
```typescript
await Deno.link(srcPath, destPath);  // HARD LINK
```

A documentação em `docs/processos/builds.md` diz:
> "Esse processo é feito através da criação de **hard links** dos arquivos dos shards"

Mas isso é contraditório com o conceito de **Store imutável** do Nix. Links simbólicos são mais seguros porque:
- Permitem que o Store seja compartilhado entre múltiplas instalações
- Não podem modificar arquivos no Store original
- São mais fáceis de gerenciar para rollback

**Veredicto**: A documentação diz hard links, mas isso pode causar problemas. Ou a implementação está errada ou a documentação está errada.

### 3. **URL Source: Descompactação Não Implementada**

Em `src/compiler/src/sources/url.ts:81-91`:
```typescript
async function unpackZip(zipPath: string, _destDir: string): Promise<void> {
  // Placeholder - would need zip library implementation
  await Deno.readFile(zipPath);
  throw new Error("ZIP unpacking not yet implemented");
}

async function unpackTar(tarPath: string, _destDir: string): Promise<void> {
  // Placeholder - would need tar library implementation
  await Deno.readFile(tarPath);
  throw new Error(" TAR unpacking not yet implemented");
}
```

A documentação diz que o Kintsugi deve suportar download e descompactação de mods, mas isso não funciona.

### 4. **Source Vase Não Implementado**

A documentação em `docs/conceitos/sources/vase.md` descreve um source `vase` para importar assets grandes, mas:
- Não existe em `src/compiler/src/sources/`
- Não existe em `src/interpreter/src/types/source.ts`
- O arquivo `docs/conceitos/vases.md` existe mas não foi implementado

### 5. **Source run_manifest Não Implementado**

A documentação menciona `write_run_spec` como um tipo de source para criar manifestos de execução, mas:
- Não existe no código
- A documentação em `docs/processos/execucao.md` descreve isso detalhadamente

### 6. **Inconsistência de Tipos Entre Interpretador e Compilador**

Os tipos de Source estão duplicados:
- `src/interpreter/src/types/source.ts` - Define tipos para o interpretador
- `src/compiler/src/types/fetchers.ts` - Define tipos para o compilador

Isso pode causar problemas de sincronização. Exemplo:
- No interpretador: `write_json`
- No compilador: `WriteJson` (interface diferente)

### 7. **Store Incompleta**

Em `src/compiler/src/store/store.ts`:
- ❌ Não há função para verificar se um shard já foi compilado (a documentação diz que deve verificar se a pasta já existe no store)
- ❌ Não há escrita de receitas no store (apenas leitura)
- ❌ Não há garbage collection

A documentação em `docs/processos/builds.md` diz:
> "Ele deve verificar se alguma pasta dentro do store já possui esse nome. Caso sim, a entrada já foi compilada"

Mas não existe essa função implementada.

### 8. **Variável de Ambiente com Nome Errado**

Em `src/core/executor/executor.ts:83`:
```typescript
KINTSUGI_ROOT: mergedPath,
```

A documentação em `docs/processos/execucao.md` diz que deve ser `KINTSUGI_ROOT` para o caminho absoluto da pasta merged, mas há outra variável documentada:
> - `KINTSUGI_modlist_NAME`: Nome do modlist sendo executado
> - `KINTSUGI_BUILD_HASH`: O hash da composição ativa

Essas variáveis não são exportadas no código.

### 9. **Erro de Digitação**

Em `src/interpreter/src/lib/environment.ts:4`:
```typescript
const ENV_FILE = "kintsugi/enviroment.json";  // "enviroment" deveria ser "environment"
```

### 10. **Loop Infinito Possível em composition.ts**

Em `src/compiler/src/sources/composition.ts:68`:
```typescript
} else if (entry.isDirectory) {
  await copyDirAsLinks(srcPath, destPath);  // Recursão infinita se houver symlinks!
}
```

Se houver um symlink de diretório, isso causará recursão infinita. Não há verificação de `entry.isSymlink`.

---

## 📊 Resumo de Implementação vs Documentação

| Feature | Documentado | Implementado | Funcionando |
|---------|--------------|--------------|-------------|
| init | ✅ | ✅ | ✅ |
| run | ✅ | ✅ | ✅ |
| compile/build | ⚠️ Parcial | ✅ | ⚠️ Parcial |
| gc | ✅ | ❌ | ❌ |
| switch | ✅ | ❌ | ❌ |
| Source: URL | ✅ | ⚠️ | ❌ (unpack) |
| Source: Local | ✅ | ✅ | ✅ |
| Source: JSON | ✅ | ✅ | ✅ |
| Source: Composition | ✅ | ⚠️ | ⚠️ (hard links) |
| Source: Vase | ✅ | ❌ | ❌ |
| Source: run_spec | ✅ | ❌ | ❌ |
| Hash determinístico | ✅ | ✅ | ✅ |
| Resolução deps | ✅ | ✅ | ✅ |
| OverlayFS | ✅ | ✅ | ✅ |
| UMU support | ✅ | ✅ | ✅ |
| Store (leitura) | ✅ | ✅ | ✅ |
| Store (verificação) | ✅ | ❌ | ❌ |
| GC | ✅ | ❌ | ❌ |

---

## 🎯 Conclusão

**A implementação atual está parcialmente correta**, cobrindo o fluxo básico mas faltando várias funcionalidades críticas:

1. **O interpretador está bem implementado** - hash, resolução de dependências, criação de composições
2. **O executor (run) está correto** - overlayFS, execução nativa e UMU
3. **O compilador (compile) está incompleto** - faltam Sources, verificação de cache, GC

**O principal problema é que o desenvolvedor saiu do escopo de implementação** em algumas áreas e **não completou funcionalidades fundamentais** que a documentação especifica como essenciais:
- Garbage Collection
- Sistema de Vases
- Descompactação de arquivos
- Comandos CLI básicos (`gc`, `switch`, `build`)

O projeto tem uma boa base conceitual e a arquitetura está bem pensada, mas precisa de mais implementação para estar utilizável.
