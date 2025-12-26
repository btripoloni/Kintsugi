# Fetcher: `fetch_url`

The `fetch_url` fetcher is responsible for downloading a file or archive from a
remote URL. It is the primary way to acquire external resources in Kintsugi.

## Schema (TypeScript)

```typescript
interface FetchUrl {
    type: "url";
    url: string; // The download URL
    sha256: string; // The expected SHA256 integrity hash
    name?: string; // Optional name for the resulting store entry
    unpack?: boolean; // Whether to automatically unpack archives
    postFetch?: string; // Optional shell script to run after download

    // Advanced HTTP options
    method?: "GET" | "POST"; // Defaults to GET
    headers?: Record<string, string>; // Custom HTTP headers
    cookies?: Record<string, string>; // Custom cookies
    body?: string; // Body for POST requests
}
```

## Behavior

1. **Request Construction**: The compiler prepares an HTTP request using the
   specified `method`, `headers`, `cookies`, and `body`.
2. **Download**: The compiler executes the request and downloads the stream.
3. **Integrity Check**: The downloaded file's SHA256 is calculated and compared
   against the `sha256` field. If they don't match, the operation fails.
4. **Unpacking**: If `unpack` is `true`, the compiler identifies the archive
   type (zip, tar, etc.) and extracts it into the temporary workspace.
5. **Transformation**: If `postFetch` is present, the compiler executes the
   provided shell script within the temporary workspace.
6. **Finalization**: The final contents of the workspace are then moved to the
   Kintsugi store at `/kintsugi/store/[hash]-[name]`.

## Usage Examples

### Simply downloading a file

```typescript
const patch = fetch_url({
    url: "https://example.com/fixes.patch",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
});
```

### Downloading from a private API

```typescript
const secretData = fetch_url({
    url: "https://api.example.com/v1/assets/mod-files",
    sha256: "...",
    headers: {
        "Authorization": "Bearer internal-token-xyz",
        "Accept": "application/octet-stream",
    },
    cookies: {
        "session_id": "12345",
    },
});
```

### Unpacking a mod and cleaning it up

```typescript
const myMod = fetch_url({
    url: "https://github.com/user/mod/releases/download/v1.0/mod.zip",
    sha256: "...",
    unpack: true,
    postFetch: `
        # Remove unnecessary documentation folder
        rm -rf docs/
        # Move mod files to the root if they are inside a subfolder
        mv internal_files/* .
        rmdir internal_files
    `,
});
```

## Implementation Notes (Go)

- Use `net/http` with a `TeeReader` to calculate the hash on-the-fly during
  download to avoid reading the file multiple times.
- `postFetch` should be executed in a restricted environment (sandbox) with at
  least `bash`, `coreutils`, and `tar/unzip` available.
- If `unpack` or `postFetch` are used, the hash of the resulting store entry is
  calculated based on the **final state** of the files, but the derivation hash
  itself is stable because it is based on the input recipe.
