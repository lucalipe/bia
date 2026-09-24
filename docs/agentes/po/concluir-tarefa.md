# Marcar tarefa como concluída e bloquear edição de título

## Contexto
Hoje a BIA tem, na tarefa (`api/models/tarefas.js`), os campos `titulo`,
`dia_atividade` e `importante`. Não existe nenhum campo relacionado a
"concluída" — nem no modelo, nem na migration mais recente
(`database/migrations/20210924000838-criar-tarefas.js`), nem na UI
(`client/src/components/Task.jsx`). O toggle de "importante" já existe via
duplo clique e via botão de estrela, chamando
`PUT /api/tarefas/update_priority/:uuid`.

Também já existe a edição de título (história em
`docs/agentes/po/editar-titulo-tarefa.md`), via botão de editar em
`Task.jsx` e rota `PUT /api/tarefas/update_titulo/:uuid`
(`api/controllers/tarefas.js`, função `update_titulo`). Essa rota hoje
aceita qualquer título não vazio, sem checar nenhum outro estado da tarefa.

Esta história adiciona um novo estado "concluída" (independente de
"importante") e exige que, uma vez concluída, o título da tarefa fique
protegido contra alteração — tanto pela UI quanto diretamente pela API,
mesmo chamando a rota de edição de título já existente.

## História
Como usuário da BIA, quero marcar uma tarefa como concluída, para que eu
possa distinguir o que já terminei do que ainda está pendente — e, uma vez
concluída, quero que o título fique protegido contra alterações acidentais,
já que a tarefa foi encerrada.

## Critérios de aceite

### Marcar/desmarcar como concluída
- [ ] Cada tarefa listada tem uma forma visível de marcar/desmarcar como
      concluída (ex.: checkbox ou botão dedicado), distinta do controle de
      "importante" e do de "editar título".
- [ ] Marcar uma tarefa como concluída não altera o campo `importante` nem
      `dia_atividade` dela.
- [ ] Uma tarefa concluída é visualmente diferenciada das demais na lista
      (ex.: estilo diferente, como já ocorre hoje com "importante" via
      classe `reminder`).
- [ ] É possível desmarcar uma tarefa concluída (voltar para não concluída)
      pelo mesmo controle, e ao desmarcar a edição de título volta a ficar
      liberada.
- [ ] O backend expõe uma rota para alternar/definir o status de concluída
      de uma tarefa pelo `uuid`, retornando a tarefa atualizada em caso de
      sucesso, seguindo o padrão das rotas existentes (ex.:
      `update_priority`).
- [ ] Se o `uuid` informado nessa rota não corresponder a nenhuma tarefa
      existente, a resposta é 404 com mensagem de erro, no mesmo padrão já
      usado pelas rotas `find`, `delete` e `update_titulo`.

### Bloqueio de edição de título quando concluída (UI)
- [ ] Em uma tarefa concluída, o botão/ícone de editar título fica
      desabilitado ou oculto, de forma que não seja possível abrir o modo
      de edição de título pela interface.
- [ ] Se o usuário desmarcar a tarefa como concluída, o botão/ícone de
      editar título volta a ficar disponível normalmente.

### Bloqueio de edição de título quando concluída (API)
- [ ] Ao chamar `PUT /api/tarefas/update_titulo/:uuid` para uma tarefa que
      está marcada como concluída, a API rejeita a atualização (não altera
      o `titulo` no banco) e responde com um status de erro (4xx) e uma
      mensagem clara indicando que a tarefa está concluída e não pode ter o
      título editado.
- [ ] Esse bloqueio na API vale independentemente da origem da chamada —
      ou seja, mesmo chamando a rota diretamente (sem passar pela tela),
      uma tarefa concluída não tem o título alterado.
- [ ] Ao chamar `PUT /api/tarefas/update_titulo/:uuid` para uma tarefa que
      **não** está concluída, o comportamento permanece exatamente o já
      existente hoje (sem regressão).
- [ ] A rota de marcar/desmarcar concluída (`update_...`) continua
      funcionando normalmente mesmo depois que o título já foi bloqueado —
      ou seja, o bloqueio afeta apenas a edição de título, não a alternância
      do próprio status de concluída.

## Fora de escopo
- Bloquear ou alterar o comportamento do toggle de "importante"
  (`update_priority`) em tarefas concluídas — os dois campos são
  independentes, conforme pedido.
- Impedir exclusão de tarefas concluídas — o fluxo de exclusão
  (`DELETE /api/tarefas/:uuid`) não é alterado por esta história.
- Edição de outros campos (`dia_atividade`) em tarefas concluídas.
- Histórico/log de quando a tarefa foi concluída.
- Conclusão em lote (múltiplas tarefas de uma vez).
- Definição de infraestrutura, deploy ou cache — a nova rota e o novo campo
  devem seguir o padrão já usado pelas rotas/migrations existentes quanto a
  invalidar/atualizar o cache e criar a coluna no banco, mas isso é decisão
  técnica do dev.

## Suposições e perguntas abertas
- Assumi que o novo campo se chama `concluida` (booleano, default `false`),
  seguindo a convenção em português já usada em `importante`. Se o time
  preferir outro nome (ex.: `finalizada`, `completed`), é só ajustar — não
  muda nenhum critério de aceite.
- Assumi que a rota de alternância de status segue o padrão de
  `update_priority`, por exemplo `PUT /api/tarefas/update_conclusao/:uuid`
  — a escolha exata do nome do endpoint fica a critério do dev, desde que
  siga a convenção das rotas existentes.
- Assumi que o bloqueio de edição de título deve ser feito checando o
  estado atual da tarefa no banco dentro do próprio `update_titulo` (não
  apenas na UI), para atender ao requisito de "mesmo chamando a rota
  diretamente".
- Não defini o código de status HTTP exato do bloqueio (400 ou 409) — fica
  a critério do dev escolher um dentro da faixa 4xx, desde que a mensagem
  deixe claro o motivo (tarefa concluída).
