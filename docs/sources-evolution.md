# Evolution of the Sources System

Currently, Kintsugi's "Sources" are defined by a monolithic `Source` struct that
combines fields for local paths, URLs, and even build instructions. This
approach lacks flexibility and becomes harder to maintain as new source types
(like Git, Mercurial, or specialized buckets) are added.

Inspired by Nix, we want to evolve this system to be more modular, extensible,
and robust.

## 1. Abstracting "Fetchers"

Instead of a single struct, we should treat sources as **Fetchers**. A Fetcher
is a mechanism that takes an input (definition) and produces a predictable
output in the Store.

### Current Mono-struct

```go
type Source struct {
    Source SourceType
    Path   string
    URL    string
    // ... many more fields
}
```

### Proposed Modular Fetchers

We can move towards a system where each Fetcher has its own schema:

- **Built-in Fetchers**:
  - `fetch_url`: Downloads a file/archive. Requires `url` and `sha256`.
  - `fetch_git`: Clones a repository. Requires `url` and `rev`/`ref`.
  - `fetch_local`: Imports a local directory or file. Requires `path`.
  - `fetch_vase`: Imports content from a named "vase". Vases are pre-prepared,
    immutable structures. This fetcher performs a direct, non-filtered link into
    the store.
  - `write_text`: Creates a plain text file in the store from a provided string.
  - `write_json`/`write_toml`: Helpers that serialize an object/map into a file
    in the store. Useful for dynamic config files.

## 2. Post-Fetch Transformations

Often, a source provides more than we need (e.g., a full repository where only
one folder matters, or a zip with garbage files).

We propose a `postFetch` hook for fetchers. This hook runs in a sandbox (similar
to a build) but is tied to the fetcher itself.

```typescript
const myMod = fetch_url({
  url: "https://github.com/user/mod/archive/main.zip",
  sha256: "...",
  unpack: true,
  // Flexible manipulation
  postFetch: `
        mv mod-folder/* .
        rm -rf mod-folder docs tests
    `,
});
```

The hash of the fetcher would then represent the **final state** of the files
after the transformation, ensuring that if the script changes, the hash changes.

## 3. Content-Addressability and Integrity

Nix shines because it enforces integrity via hashes. We should ensure that
_every_ fetcher (except perhaps `fetch_local` during development) requires a
hash to ensure reproducibility.

- **Fixed-output Derivations**: In Nix, fetchers are often represented as
  special derivations whose output hash is known in advance.
- **Store Path**: The result of a fetcher should be stored in
  `/kintsugi/store/[hash]-[name]`.

## 4. Flexibility and Composition

If we treat a Source as a first-class citizen (essentially a derivation that
just fetches), we can compose them.

For example, a `compose` operation could take multiple sources:

```typescript
const base = fetch_url({ url: "...", sha256: "..." });
const patches = fetch_git({ url: "...", ref: "..." });

const myMod = mkDerivation({
  src: [base, patches], // Multiple sources? Or a merged source?
  build: "patch -p1 < patches/patch1.diff",
});
```

### Filtering (Nix `builtins.path`)

For local sources, we should support a `filter` function or glob patterns to
prevent importing unnecessary files (like `.git` or `node_modules`) into the
store.

```typescript
const localSrc = fetch_local({
  path: "./my-mod",
  exclude: [".git", "tmp/*"],
});
```

## 5. Discussion Outcomes

- **The `write_*` Helpers**: Confirmed. `write_json` and `write_toml` will be
  added as convenience helpers.
- **Hash Integrity**: Confirmed. The hash of a source derivation represents the
  **input recipe** (excluding the output path). Change the script or the URL,
  and the hash changes.
- **Lazy Fetching**: Confirmed. A fetcher is only "realized" (executed) if its
  path doesn't already exist in the Kintsugi store.
- **Sandbox for `postFetch`**: Agreement that a sandbox (bash/coreutils) is
  necessary for robustness, but can be implemented incrementally.

### Isolation and Determinism

Unlike Nix, Kintsugi enforces a strict separation between **Interpretation** and
**Realization**:

1. **Interpretation (TypeScript)**: The interpreter runs your code once to
   generate a "Recipe" (JSON). It does **not** have access to the Internet or
   the Store. It cannot see the contents of a file that hasn't been fetched yet.
2. **Realization (Go/Compiler)**: The compiler reads the Recipe and executes the
   fetchers and builds.

Because of this isolation, **Import-from-Derivation (IFD) is not possible**. You
cannot fetch a JSON file and then use its contents to decide what other mods to
fetch within the same run. This ensures that the modpack definition is static
and predictable once interpretation is finished.

## 6. JSON Representation

To support multiple fetchers, the Recipe JSON will use a **discriminant field**
(e.g., `"type"`). This allows the Go compiler to unmarshal the content into the
correct struct based on the type.

### Example: `fetch_url`

```json
{
  "type": "fetch_url",
  "url": "https://example.com/mod.zip",
  "sha256": "abc...123",
  "unpack": true,
  "postFetch": "rm -rf junk/"
}
```

### Example: `write_json`

```json
{
  "type": "write_json",
  "path": "config.json",
  "content": {
    "enableFeature": true,
    "limit": 50
  }
}
```

### Comparison: Old vs. New

| Feature             | Old Monolithic                | New Modular                     |
| :------------------ | :---------------------------- | :------------------------------ |
| **JSON Key**        | Always `source`               | Uses `type` as discriminant     |
| **Flexibility**     | Limited to hardcoded fields   | Extensible with new types       |
| **Validation**      | Hard to validate extra fields | Each type has its own validator |
| **Post-processing** | Limited to `unpack` and `run` | Arbitrary `postFetch` scripts   |

## 7. Implementation Decisions

Based on our discussion, the following architectural patterns will be used:

### 7.1. TypeScript (Discriminated Unions)

We will use Discriminated Unions in `types.ts` to ensure type safety. Every
fetcher will extend a `BaseFetcher` and define a unique `type` literal.

```typescript
type Source = FetchUrl | FetchLocal | FetchVase | WriteText | WriteJson;
```

### 7.2. Go (Polymorphic Interfaces)

The Go side will transition from a monolithic struct to an `interface` based
approach.

```go
type Fetcher interface {
    Realize(s *store.Store, dest string) error
    Type() string
}
```

Implementation will involve a two-step JSON unmarshaling:

1. Parse the `type` field.
2. Unmarshal into the specific struct (e.g., `URLFetcher`) based on that type.

### 7.3. The Realization Flow (The "Nix Way")

The process for realizing a fetcher is strictly isolated and reproducible:

1. **Identity**: Calculate the derivation hash based on the recipe (input).
2. **Check**: If `/store/[hash]-[name]` exists, skip (cached).
3. **Prepare**: Create a temporary workspace.
4. **Execute**: Run the primary fetch logic (download, clone, etc.).
5. **Post-Process**: Run the `postFetch` script within a sandbox
   (bash/coreutils).
6. **Finalize**: Move the resulting files to the final store path and set them
   to read-only.

## 8. Summary

This new architecture makes Kintsugi:

- **Modular**: New sources can be added without touching the core compiler.
- **Safe**: TypeScript ensures modpack authors provide all necessary fields.
- **Robust**: The strictly isolated realization process guarantees that what is
  fetched and processed is exactly what ends up in the store.
