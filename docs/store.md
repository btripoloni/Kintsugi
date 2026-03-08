# Store

The **Store** (`~/.kintsugi/store/`) is where all builds are stored. Each built Shard resides in a directory named `[hash]-[name]-[version]`.

### Store Characteristics

- **Immutable**: Once in the Store, a Shard cannot be modified
- **Deduplication**: Identical Shards share the same directory
- **Garbage Collection**: Use `kintsugi gc` to remove unused Shards
