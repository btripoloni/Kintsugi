# Fetcher: `fetch_local`

The `fetch_local` fetcher is used to import files or directories from the user's
filesystem (typically the modpack directory) into the Kintsugi Store.

## Schema (TypeScript)

```typescript
interface FetchLocal {
    type: "local";
    path: string; // Path to the file or directory (relative to modpack root)
    exclude?: string[]; // Glob patterns to ignore (e.g., [".git", "node_modules"])
    name?: string; // Optional name for the store entry
    postFetch?: string; // Optional transformation script
}
```

## Behavior

1. **Resolution**: The `path` is resolved relative to the modpack's root
   directory.
2. **Filtering**: The compiler walks the file tree. Any file or directory
   matching a pattern in `exclude` is skipped.
3. **Transformation**: If `postFetch` is present, the compiler executes the
   shell script in the temporary workspace.
4. **Finalization**: The resulting files are moved to
   `/kintsugi/store/[hash]-[name]` and set to read-only.

## Usage Example

```typescript
const myMod = fetch_local({
    path: "./source-src",
    exclude: ["*.log", "tests/"],
});
```

## Implementation Notes (Go)

- Use `filepath.WalkDir` with pattern matching for `exclude`.
- Use hard links for efficiency before transformations, but ensure the final
  store entry is immutable.
