Uma composição e um shard que explica ao compilador como deve formar o sistema de arquivos uma modlist.
ele deve ficar no store junto com os outros shards.
ele vai receber o nome, lista de mods, e outras informações que vão ajudar o compilador.

Exemplo de como uma composição é, bem similar ao uma derivação do nix.

```json
{
    "out": "592517263863d0992ef1ce31f43634b2-ExampleModpack-generated",
    "src": {
      "type": "build",
      "source": "build",
      "layers": [ // Odem das camadas 
        "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
        "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
        "0841c53c2c1377ecdcd5e68ef52c7ac4-skse-2.2.6",
      ]
    },
    "dependencies": [ // Define o que essa composição vai usar
      "87d173fde2a310f689e131926624283b-skyrimse-1.16.1170",
      "aa322c36a09e696d40f84215bdb8770e-run-spec-launcher-1.0.0",
      "0841c53c2c1377ecdcd5e68ef52c7ac4-skse-2.2.6",
    ]
}
```

# Como a composição será montada?
Cabe ao kintsugi criar hard links na pasta da composição substituindo os links que vieram por ultimo.
