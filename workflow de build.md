Esse documento ira descrever o processod e build de uma modlist.

O orquestrador ira enviar um json para o programa em go. com a lista de mods, essa lista estará dentro de um objeto exemplo.
{
  mods: []
}

cada mod será um objeto que sera montado pelo orquestrador. no caso será assim 
{
  mod_name: ""
  mod_version: ""
  source: <caminho para um zip>
}

cabe ao processo de build da versão atual da modlist 