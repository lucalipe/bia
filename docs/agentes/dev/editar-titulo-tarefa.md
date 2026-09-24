# Dev: Editar título de uma tarefa existente

> Reconstruído a partir do relatório original do agente `dev` (a
> implementação já estava commitada antes da reorganização dos outputs em
> `docs/agentes/`).

## Arquivos criados/alterados

- `api/controllers/tarefas.js` — novo método `update_titulo`.
- `api/routes/tarefas.js` — nova rota `PUT /api/tarefas/update_titulo/:uuid`.
- `tests/unit/controllers/tarefas.test.js` — testes unitários para
  `update_titulo` (sucesso, 404, 400 vazio, 400 ausente, erro 500).
- `client/src/components/Task.jsx` — modo de edição de título (botão editar,
  input, salvar/cancelar, Enter/Esc, validação inline via `Modal`).
- `client/src/components/Tasks.jsx` — repassa a nova prop `onEditTitulo`
  para `Task`.
- `client/src/App.jsx` — nova função `editTaskTitulo`, passada como
  `onEditTitulo` para `Tasks`.
- `client/src/index.css` — estilos para os novos botões e input de edição.

## Abordagem

- Backend: seguiu exatamente o padrão de `update_priority` (update →
  refreshCache → findByPk → 404 se não achar), acrescentando validação de
  título vazio/ausente com `400` antes de tocar o banco.
- Rota nova: `PUT /api/tarefas/update_titulo/:uuid`, espelhando o formato de
  `update_priority`.
- Frontend: `Task.jsx` ganhou estado local (`isEditing`, `editedTitulo`,
  `showModal`). Duplo clique continua marcando/desmarcando importante
  (desabilitado só enquanto edita). Validação de campo vazio reaproveita o
  `Modal` já usado em `AddTask.jsx`.
- `dia_atividade` e `importante` não são tocados pela nova função/rota.
- Cache: segue a mesma estratégia de `update_priority` (chama
  `refreshCache()` após o update).

## Critérios não verificados

Ambiente Windows sem Node.js nem Docker — não foi possível rodar `npm
start`, `docker compose up` nem os testes Jest. Código implementado e
revisado por leitura; verificação funcional real ficou a cargo do `qa`.

## Decisões técnicas

- Nome da rota: `PUT /api/tarefas/update_titulo/:uuid` (uma das duas opções
  sugeridas pela própria história).
- Mensagem de erro de título vazio no backend: "O título da tarefa é
  obrigatório."
- Mensagem de erro de título vazio no frontend: reaproveitado o `Modal`
  existente com o texto "O título da tarefa não pode ficar vazio".
- Ordem de validação no backend: título vazio é rejeitado com 400 antes de
  checar se o uuid existe (evita ida ao banco desnecessária).
