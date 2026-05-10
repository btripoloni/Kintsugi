# Nexus Mods Integration Guide

## Overview
This document outlines the Nexus Mods integration in Kintsugi, which allows for importing mods manually downloaded by the user, verified via SHA256 hashes.

## Motivation
Due to Nexus Mods API restrictions, automated downloads aren't feasible for all users. This integration provides a bridge:
1. User manually downloads the file to `~/.kintsugi/downloads`.
2. Kintsugi verifies the file integrity.
3. Kintsugi integrates the verified file into the build pipeline.

## Implementation Details

### 1. SDK Updates (`packages/sdk/src/types/`)
*   **`fetchers.ts`**: Defined `FetchNexus` interface.
    *   `game`, `modId`, `fileId` (metadata).
    *   `sha256` (required for verification).
    *   `unpack` (boolean flag for archive handling).
*   **`shard.ts`**: Updated `Source` union type to include `FetchNexus`.

### 2. CLI Execution (`apps/cli/src/sources/nexus.ts`)
The `executeNexus` function follows this logic:
1. Locates `~/.kintsugi/downloads`.
2. Scans files in that directory.
3. Computes SHA256 for each file.
4. Matches against the provided `sha256` in the modlist.
5. If found, copies (or unpacks) the file to the `outputDir`.
6. Throws a clear error if no matching file is found.

### 3. Build Command Integration (`apps/cli/src/commands/build.ts`)
Updated `executeSource` to dispatch `nexus` types to `executeNexus`, ensuring `kintsugiRoot` is passed correctly to access the downloads directory.

## Testing Strategy
Tests are implemented in `apps/cli/src/sources/nexus_test.ts` using Deno's test runner.
*   **Success Scenario**: File exists in downloads with correct hash.
*   **Failure Scenario (Missing)**: File not present in downloads.
*   **Failure Scenario (Hash Mismatch)**: File present but incorrect hash.

## Future Recommendations
*   **Unpacking Utility**: Currently, `nexus.ts` implements a simple copy. The unpacking logic from `url.ts` should be refactored into a shared utility to avoid duplication.
*   **Nexus API**: Future iterations could integrate the Nexus API for metadata or automated download links if user authentication is handled securely.
