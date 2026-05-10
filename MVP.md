# Kintsugi MVP - Minimum Viable Product

## Visão Geral

MVP é um modpack manager funcional com as operações essenciais:
- Criar modlist
- Build (interpretar + compilar)
- Run (executar jogo)

Tudo mais (GC, Vases, rollback) pode ser adicionado depois.

---

## 1. Comandos do MVP

| Comando | Status | Notas |
|---------|--------|-------|
| `init` | ✅ Existe | Precisa de ajustes no template |
| `build` | ❌ Não existe | **PRIORIDADE 1** - precisa ser criado |
| `run` | ⚠️ Parcial | Precisa de ajustes para funcionar com build |
| `gc` | ❌ Não existe | Pode ficar para depois |
| `vase` | ❌ Não existe | Pode ficar para depois |
| `modlist` | ❌ Não existe | Pode ficar para depois |

---

## 2. Fluxo MVP

```
1. kintsugi init skyrim
   └── Cria pasta ~/.kintsugi/modlists/skyrim/
       └── main.ts (template básico)
       └── modlist.json (metadados)

2. edita main.ts definindo a modlist

3. kintsugi build skyrim
   └── Executa interpretador (main.ts → recipes)
   └── Compila todas as receitas
   └── Cria composição no store
   └── Cria link active no modlist

4. kintsugi run skyrim
   └── Monta OverlayFS
   └── Lê run.json da composição
   └── Executa o jogo
```

---

## 3. O que NÃO precisa no MVP

- ❌ Sistema de Vases completo (pode usar local source temporariamente)
- ❌ GC automatizado
- ❌ Histórico de builds
- ❌ Rollback
- ❌ Múltiplos perfis de execução (apenas default)
- ❌ Sistema de modlists (management de múltiplas modlists)

---

## 4. Estrutura de Arquivos MVP

```
~/.kintsugi/
├── modlists/
│   └── skyrim/
│       ├── main.ts           # Definição da modlist
│       ├── modlist.json      # {"name": "skyrim"}
│       └── active -> /store/...  # Link para build atual
├── store/
│   ├── [hash]-[name]-[version]/  # Shards individuais
│   └── recipes/
│       └── [hash]-[name]-[version].json
```

---

## 5. main.ts Template MVP

```typescript
export default {
  name: "skyrim",
  version: "1.0.0",
  out: "output",
  src: {
    type: "url",
    url: "https://example.com/mod.zip",
    sha256: "abc123...",
  }
} satisfies Derivation;
```

Ou com composição:

```typescript
export default {
  name: "skyrim-modlist",
  version: "1.0.0",
  src: {
    type: "composition",
    layers: [
      "hash-game-1.0.0",
      "hash-mod1-1.0.0"
    ]
  }
} satisfies Derivation;
```

---

## 6. Código Legado para Deletar

### 6.1 Arquivos que não são usados

- `src/interpreter/src/lib/modpack.ts` - lógica de resolução de deps não integrada
- `src/interpreter/src/types/environment.ts` - não usado
- `src/interpreter/src/lib/environment.ts` - não usado
- `src/compiler/src/main.ts` - não usado

### 6.2 Código duplicado/renundante

- Muitos tipos em `interpreter/src/types/` vs `compiler/src/types/` - precisa unificar
- Arquivos de teste que não correspondem ao código atual

---

## 7. Prioridades de Implementação

### Phase 1: Build (CRÍTICO)
1. Criar comando `build` na CLI
2. Integrar interpretador (executar main.ts)
3. Gerar receitas
4. Compilar receitas → Store
5. Criar composição com links

### Phase 2: Run (Ajustar)
1. Ajustar run para usar composition do store
2. Garantir que build cria o run.json corretamente

### Phase 3: Limpeza
1. Deletar código não usado
2. Unificar tipos duplicados
3. Ajustar testes

---

## 8. Critérios de Sucesso do MVP

- [ ] `kintsugi init <name>` cria modlist funcional
- [ ] `kintsugi build` interpreta main.ts e cria entradas no store
- [ ] `kintsugi run` executa o jogo com OverlayFS
- [ ] Uma modlist simples (1-2 mods) funciona do início ao fim

---

## 9. O que será IMPLEMENTADO no MVP

### CLI
- `init` - criar modlist (revisar template)
- `build` - **NOVO** - interpretar + compilar
- `run` - executar (ajustar para funcionar com build)

### Interpretador
- Executar main.ts com Deno
- Gerar receitas JSON
- Calcular hash

### Compilador
- Receber receitas
- Build de cada shard (url, local, json)
- Criar composição (hard links)
- Criar link active

### Executor
- Já existe, apenas ajustar para novo fluxo

---

## 10. O que será ADIADO

- Sistema de Vases completo
- Garbage Collector
- Histórico de builds
- Rollback
- Múltiplas modlists (management)
- Comandos: `gc`, `vase`, `modlist`