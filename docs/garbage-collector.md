# Garbage Collector

O comando `kintsugi gc` remove shards, receitas e builds que não tem referencia a nenhuma modlist ativa. 

```bash
# Simulate (doesn't delete anything)
kintsugi gc --dry-run

# Run garbage collection
kintsugi gc
```

This helps free up disk space by removing old builds that are no longer needed.

# Workflow 
O usuario roda o comando 'gc' o executor inicia o trabalho de remover o lixo.
o gc deve passar analizando: 
  - Se alguma build já não está mais ativa, uma build não vinculada a algum modlist, essas builds são consideradas lixo e podem ser limpas.
  - Se alguma entrada na store já não esta sendo usada por nenhuma build, caso não esteja a entrada também é considerada lixo.
  - Receitas orfãs, uma receita orfã não tem uma entrada correspondente no store e deve ser limpa.

