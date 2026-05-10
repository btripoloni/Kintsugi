# Proposta de Testes E2E para Kintsugi

## Visão Geral

Esta proposta descreve uma estratégia para implementar testes end-to-end (E2E) no projeto Kintsugi, um gerenciador de modpacks escrito em TypeScript/Deno.

---

## 1. Por que Testes E2E?

O projeto atualmente possui:
- Testes unitários (ex: `run_test.ts`)
- Testes de integração (ex: `integration_local_test.ts`)

Falta uma camada que teste o CLI como o usuário final interage:
- Command-line arguments completos
- Integração entre interpretador, compilador e executor
- Fluxos completos: `init` → `build` → `run`
- Criação e manipulação do Store

---

## 2. Abordagem Proposta

### 2.1 Ferramenta: Deno Command

Usar `Deno.Command` para executar o CLI como processo externo:

```typescript
const command = new Deno.Command("deno", {
    args: ["run", "-A", cliPath, "build", modlistName],
    cwd: tmpDir,
});
const result = await command.output();
```

**Vantagens:**
- Não requer dependências externas
- Mesma API do Deno Test
- Controle total sobre stdin/stdout/stderr
- Isolamento de processos

### 2.2 Estrutura de Diretórios

```
apps/cli/src/tests/
├── e2e_test.ts              # Ponto de entrada
├── e2e/
│   ├── init_test.ts         # Testes E2E do comando init
│   ├── build_test.ts        # Testes E2E do comando build
│   ├── run_test.ts          # Testes E2E do comando run
│   └── compile_test.ts      # Testes E2E do comando compile
└── fixtures/                # Modlists de teste
    └── minimal/
        └── main.ts          # Modlist mínimo para testes
```

---

## 3. Exemplos de Testes

### 3.1 Teste do comando init

```typescript
Deno.test("E2E: init cria estrutura de modlist", async () => {
    const tmpDir = await Deno.makeTempDir();
    const modlistName = "test-mod";

    const result = await new Deno.Command("deno", {
        args: ["run", "-A", cliPath, "init", modlistName],
        cwd: tmpDir,
    }).output();

    assertEquals(result.code, 0);
    assertExists(await Deno.stat(join(tmpDir, "modlists", modlistName, "main.ts")));
});
```

### 3.2 Teste do comando build

```typescript
Deno.test("E2E: build interpreta e compila modlist", async () => {
    // Setup: criar modlist de teste
    const tmpDir = await Deno.makeTempDir();
    await createModlist(tmpDir, "skyrim", minimalModlist);

    // Executar build
    const result = await new Deno.Command("deno", {
        args: ["run", "-A", cliPath, "build", "skyrim", "--root", tmpDir],
        cwd: tmpDir,
    }).output();

    // Verificar saída
    assertEquals(result.code, 0);
    assertExists(await Deno.stat(join(tmpDir, "store", "recipes")));
});
```

### 3.3 Teste de fluxo completo

```typescript
Deno.test("E2E: init + build + run (fluxo completo)", async () => {
    const tmpDir = await Deno.makeTempDir();
    const modlistName = "full-test";

    // Step 1: Init
    const initResult = await runCli(["init", modlistName], tmpDir);
    assertEquals(initResult.code, 0);

    // Step 2: Build
    const buildResult = await runCli(["build", modlistName, "--root", tmpDir], tmpDir);
    assertEquals(buildResult.code, 0);

    // Step 3: Run (dry-run ou com source mockado)
    // O run pode precisar de um vaso ou source real
});
```

---

## 4. Fixture: Modlist Mínimo

```typescript
// tests/fixtures/minimal/main.ts
import { Shard, Source } from "@btripoloni/kintsugi";

export const modpack: Shard = {
    name: "minimal-test",
    version: "1.0.0",
    out: "abc123-minimal-test-1.0.0",
    src: {
        type: "write_json",
        path: "./output/test.json",
        content: { test: true },
    },
};
```

---

## 5. Comandos para Executar

```bash
# Todos os testes E2E
deno test --allow-all ./apps/cli/src/tests/e2e/

# Teste específico
deno test --allow-all --filter "E2E: build" ./apps/cli/

# Com verbose
deno test -v --allow-all ./apps/cli/
```

---

## 6. Permissões Necessárias

| Permissão | Uso |
|-----------|-----|
| `--allow-all` | Desenvolvimento/testing |
| `--allow-read` | Ler arquivos de fixture |
| `--allow-write` | Criar diretórios temporários |
| `--allow-run` | Executar CLI como subprocesso |
| `--allow-env` | Variáveis de ambiente (se necessário) |

---

## 7. Boas Práticas

1. **Isolamento**: Sempre usar `Deno.makeTempDir()` para cada teste
2. **Cleanup**: Limpar recursos no bloco `finally`
3. **Fixtures**: Criar modlists reutilizáveis em `fixtures/`
4. **Nomenclatura**: Prefixar testes com "E2E:" para filtragem
5. **Assertions claras**: Incluir mensagens de erro informativas

---

## 8. Próximos Passos Sugeridos

1. Criar diretório `apps/cli/src/tests/e2e/`
2. Implementar helper `runCli()` para executar comandos
3. Criar fixture `minimal/main.ts`
4. Implementar testes para comando `init`
5. Implementar testes para comando `build`
6. Adicionar ao CI/CD (se existir)

---

## 9. Considerações

- **Rede**: Testes que envolvem downloads reais devem usar URLs de teste ou serem skippados
- **Tempo**: E2E são mais lentos que unit tests - isolar testes lentos se necessário
- **Vases**: O comando `run` pode precisar de um vaso configurado
- **OverlayFS**: Requer `fuse-overlayfs` instalado no sistema

---

## 10. Alternativas Consideradas

| Abordagem | Prós | Contras |
|-----------|------|---------|
| Deno Command (proposto) | Sem deps externas, mesma API | Menos realista que browser/Playwright |
| Playwright | Mais robusto | Dependência externa, over-engineering |
| Vitest + npm | Popular | Não é Deno-native |
| Shell script | Simples | Menos controle, difícil debugging |

A abordagem com Deno Command é a mais adequada para um CLI Deno-native.

---

*Proposta criada em: 2026-04-01*