# Fetchers: `write_text`, `write_json`, and `write_toml`

Writers are special fetchers that don't pull data from the network or the local
filesystem. Instead, they create a new file in the Store using content provided
directly by the Kintsugi interpreter. This is essential for generating
configuration files, scripts, or small pieces of data dynamically.

## 1. `write_text`

Creates a plain text file.

```typescript
interface WriteText {
    type: "write_text";
    path: string; // Name of the file (e.g., "script.sh")
    content: string; // The text content
}
```

## 2. `write_json`

Heper that serializes a JavaScript object into a `.json` file.

```typescript
interface WriteJson {
    type: "write_json";
    path: string; // Name of the file (e.g., "config.json")
    content: any; // Any serializable object
}
```

## 3. `write_toml`

Helper that serializes a JavaScript object into a `.toml` file.

```typescript
interface WriteToml {
    type: "write_toml";
    path: string; // Name of the file (e.g., "settings.toml")
    content: any; // Any serializable object
}
```

---

## Behavior

1. **Serialization**: For `write_json` and `write_toml`, the compiler serializes
   the `content` field into the appropriate format.
2. **Creation**: A temporary workspace is created, and a single file named
   `path` is written with the content.
3. **Finalization**: The file is moved to the Store at
   `/kintsugi/store/[hash]-[path]`.

---

## Usage Examples

### Generating a custom run script

```typescript
const runScript = write_text({
    path: "start.sh",
    content: `#!/bin/bash\nexec my-game -mod ${modPath}\n`,
});
```

### Passing configuration to a mod

```typescript
const config = write_json({
    path: "config.json",
    content: {
        resolution: "1920x1080",
        fullscreen: true,
        plugins: ["hdr", "high-textures"],
    },
});
```

## Implementation Notes (Go)

- The Go compiler should use standard libraries (like `encoding/json`) or a TOML
  library to perform the serialization.
- This operation is strictly local and extremely fast, as it only involves
  writing a small file to disk.
- Even though these are "writers", the resulting store entry remains
  **immutable** once finalized.
