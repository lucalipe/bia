# Editar título de uma tarefa existente

## Contexto
Hoje a BIA permite criar tarefas (`POST /api/tarefas`), listar (`GET /api/tarefas`),
marcar/desmarcar como importante (`PUT /api/tarefas/update_priority/:uuid`) e
excluir (`DELETE /api/tarefas/:uuid` e `DELETE /api/tarefas`). Não existe rota
de backend nem elemento de UI para alterar o título de uma tarefa já criada —
confirmado em `api/routes/tarefas.js`, `api/controllers/tarefas.js` e nos
componentes `client/src/components/Task.jsx` e `client/src/App.jsx`. Hoje, se
o usuário errar ou quiser ajustar o texto de uma tarefa, a única opção é
excluí-la e criar outra do zero.

## História
Como usuário da BIA, quero editar o título de uma tarefa que já criei, para
que eu possa corrigir ou ajustar o texto sem precisar excluir a tarefa e
perder o histórico dela (data, status de importante).

## Critérios de aceite
- [ ] Cada tarefa listada tem uma forma visível de entrar em modo de edição do
      título (ex.: botão/ícone de editar), sem precisar de duplo clique (esse
      gesto já é usado para marcar/desmarcar importante).
- [ ] Ao entrar em modo de edição, o título atual da tarefa aparece
      preenchido em um campo editável.
- [ ] Ao confirmar a edição com um título não vazio (após remover espaços em
      branco das pontas), a tarefa é atualizada e o novo título passa a ser
      exibido na lista, sem exigir reload manual da página.
- [ ] Ao tentar confirmar a edição com o campo vazio ou só com espaços em
      branco, a edição não é enviada e uma mensagem de erro é exibida,
      mantendo o modo de edição aberto.
- [ ] Existe uma forma de cancelar a edição sem salvar (ex.: botão
      "Cancelar" ou tecla Esc), restaurando o título original exibido.
- [ ] A data (`dia_atividade`) e o status de importante da tarefa não são
      alterados por essa ação de edição de título.
- [ ] O backend expõe uma rota para atualizar o título de uma tarefa
      existente pelo `uuid`, retornando a tarefa atualizada em caso de
      sucesso.
- [ ] Se o `uuid` informado não corresponder a nenhuma tarefa existente, a
      rota responde com status 404 e uma mensagem de erro, no mesmo padrão
      já usado pelas rotas `find` e `delete`.
- [ ] Se o título enviado ao backend vier vazio ou ausente, a rota rejeita a
      atualização com um erro (não persiste o título vazio no banco).

## Fora de escopo
- Edição de outros campos da tarefa (data, importante) nesta mesma ação —
  essas já têm seus próprios fluxos.
- Histórico/log de alterações de título (quem editou, quando, valor anterior).
- Edição em lote (múltiplas tarefas de uma vez).
- Definição de infraestrutura, deploy ou cache (a rota nova de edição deve
  seguir o padrão já usado pelas rotas existentes quanto a invalidar/atualizar
  o cache, mas essa é uma decisão técnica do dev, não de produto).

## Suposições e perguntas assumidas
- Assumi que a rota de edição de título deve seguir o padrão REST já usado no
  projeto (semelhante a `update_priority`), por exemplo
  `PUT /api/tarefas/update_titulo/:uuid` ou reaproveitar uma rota `PUT
  /api/tarefas/:uuid` genérica — a escolha exata do endpoint fica a critério
  do dev, desde que siga a convenção das rotas existentes.
- Assumi que o limite máximo de caracteres do título é o mesmo já aceito hoje
  na criação de tarefa (não há validação de tamanho máximo hoje em
  `AddTask.jsx`), então não criei critério de aceite sobre limite de
  caracteres.
