# O que são 'vases'

Vases são similares aos 'shards' do Kintsugi, mas são usados para armazenar
arquivos que não devem ser gerenciados pelo store, ou seja eles não são
derivados. E não serão removidos pelo garbage collector.

o conteudo de um vase deve ser usado pelos shards para criar derivados usando
hardlinks. de maneira similar ao mklocal, mas ao inves de copiar o conteudo do
vase para a derivação, ele deve ser linkado.

os vases não são armazenados no store, mas sim em uma pasta vizinha chamada
'vases'

Os vases são gerenciados pelo 'executor' usando o comando 'kintsugi vase'. as
operações são add, remove e list.

add: cria um novo vase remove: remove um vase list: lista os vases

## add

campos: nome e path Quando for acionado ele vai copiar o conteudo do path para a
pasta 'vases' e retornar o nome do vase criado.

## remove

campos: nome Quando for acionado ele vai remover o vase com o nome passado.
Antes de remover ele deve verificar se o vase existe, e se alguma derivação está
usando ele. Caso esteja ele deve retornar um erro.

## list

Quando for acionado ele vai listar todos os vases existentes.

## nome de um vase

O nome de um vase vai ser [nome]-[numero incremental apartir de 1]. por exemplo:

- game-1
- game-2
- game-3

Um novo tipo de source vai ser adicionado ao Kintsugi para permitir o uso de
vases. O tipo 'vase' vai receber o nome do vase como parametro. ele vai criar
uma derivação que vai usar o vase como source, fazendo um hardlink para a pasta
do vase.
