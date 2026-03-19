# Store

O **Store** (`~/.kintsugi/store/`) é onde todas as builds são armazenadas. Cada Shard construído reside em um diretório nomeado `[hash]-[nome]-[versão]`.

### Características do Store

- **Imutável**: Uma vez no Store, um Shard não pode ser modificado
- **Deduplicação**: Shards idênticos compartilham o mesmo diretório
- **Garbage Collection**: Use `kintsugi gc` para remover Shards não utilizados
