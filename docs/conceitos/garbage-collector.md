# Garbage Collector

O comando `kintsugi gc` remove shards, receitas e builds que não têm referência a nenhuma modlist ativa.

```bash
# Simular (não apaga nada)
kintsugi gc --dry-run

# Executar garbage collection
kintsugi gc
```

Isso ajuda a liberar espaço em disco removendo builds antigas que não são mais necessárias.

# Workflow
O usuário roda o comando `gc` e o executor inicia o trabalho de remover o lixo.
O gc deve analisar:
- Se alguma build já não está mais ativa: uma build não vinculada a algum modlist é considerada lixo e pode ser limpa.
- Se alguma entrada na store já não está sendo usada por nenhuma build; caso não esteja, a entrada também é considerada lixo.
- Receitas órfãs: uma receita órfã não tem uma entrada correspondente no store e deve ser limpa.
