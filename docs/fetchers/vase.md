# Fetcher: `fetch_vase`

The `fetch_vase` fetcher is the simplest way to import content into a
derivation. It pulls from Kintsugi's global **Vase** collection. Vases are
pre-prepared, immutable structures on the local machine.

## Schema (TypeScript)

```typescript
interface FetchVase {
    type: "vase";
    vase: string; // The name of the registered vase (e.g., "game-assets")
}
```

## Behavior

1. **Direct Import**: The compiler identifies the vase in the global vases
   directory (`$HOME/.kintsugi/vases/[vase_name]`).
2. **No Processing**: Unlike other fetchers, `fetch_vase` performs **no
   filtering and no transformations**. It assumes the vase is already in its
   final desired state.
3. **Finalization**: The entire vase contents are hard-linked (or symlinked)
   directly into the store path `/kintsugi/store/[hash]-[vase]`.

## Usage Example

```typescript
const gameBase = fetch_vase({
    vase: "skyrim-base-assets",
});
```

## Implementation Notes (Go)

- This is an optimized operations. It should be a simple `linkTree` from the
  vase source to the store destination.
- Since Vases are meant to be shared assets, this operation is extremely fast.
