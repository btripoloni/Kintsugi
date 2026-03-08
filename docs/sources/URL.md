Baixa um arquivo ou pacote de uma URL remota.

 **Parâmetros:**
- `url: string`: A URL para o download.
- `sha256: string`: O hash de integridade SHA256 esperado.
- `unpack?: boolean`: Descompacta o arquivo automaticamente (se for `.zip`, `.tar`, etc.).
- `method?: "GET" | "POST"`
- `headers?: Record<string, string>`
- `cookies?: Record<string, string>`
- `body?: string`