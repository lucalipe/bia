# QA: Editar título de uma tarefa existente

## Método usado
Estático. `node -v`, `npm -v` e `docker -v` retornaram "command not found"
neste ambiente (Git Bash no Windows) — não há como rodar `npm test` nem
subir a aplicação. Fiz leitura linha a linha do `git diff` (mudanças ainda
não commitadas) contra cada critério de aceite de
`docs/historias/editar-titulo-tarefa.md`, comparando o novo endpoint com os
já existentes (`find`, `delete`, `update_priority`) para checar aderência ao
padrão do projeto, e conferi se os asserts do teste automatizado novo em
`tests/unit/controllers/tarefas.test.js` realmente testam o que dizem
testar (mocks, chamadas esperadas, retorno).

## Critérios de aceite

- [x] Forma visível de entrar em modo de edição sem duplo clique — botão
  dedicado com ícone `FaEdit` e `title="Editar título"`
  (`client/src/components/Task.jsx:84-90`), chama `startEditing()`. O
  `onDoubleClick` do card continua exclusivo para marcar importante e é
  desativado durante a edição (`Task.jsx:45`: `!isEditing && onToggle(...)`),
  então os dois gestos não colidem.
- [x] Título atual preenchido ao entrar em edição — `editedTitulo` é
  inicializado com `task.titulo` (`Task.jsx:7`) e `startEditing` reforça
  isso (`Task.jsx:10-13`); o `<input>` usa `value={editedTitulo}`
  (`Task.jsx:49-56`).
- [x] Confirmar com título não vazio (trim) atualiza a tarefa e reflete na
  lista sem reload — `confirmEditing` faz `editedTitulo.trim()`
  (`Task.jsx:21`) e só então chama `onEditTitulo(task.uuid, tituloTrimmed)`
  (`Task.jsx:28`). Em `App.jsx:131-166`, `editTaskTitulo` faz
  `PUT /api/tarefas/update_titulo/:uuid` e, em sucesso, atualiza o estado
  local via `setTasks(tasks.map(...))` substituindo apenas o `titulo`
  (`App.jsx:155-159`) — React re-renderiza a lista automaticamente, sem
  necessidade de reload.
- [x] Confirmar com campo vazio/só espaços não envia e mostra erro,
  mantendo o modo de edição aberto — em `confirmEditing`, se
  `tituloTrimmed` for vazio, apenas `setShowModal(true)` é chamado e a
  função retorna (`Task.jsx:23-26`) sem chamar `onEditTitulo` nem
  `setIsEditing(false)`; o modo de edição permanece ativo. O `Modal`
  (`client/src/components/Modal.jsx`) é exibido com mensagem "O título da
  tarefa não pode ficar vazio" (`Task.jsx:109-115`). O mesmo caminho é
  usado ao pressionar Enter (`handleKeyDown` chama `confirmEditing`,
  `Task.jsx:32-35`).
- [x] Forma de cancelar sem salvar (botão e Esc), restaurando título
  original — botão "Cancelar" com ícone `FaTimes` chama `cancelEditing`
  (`Task.jsx:74-80`); tecla Esc no input também chama `cancelEditing` via
  `handleKeyDown` (`Task.jsx:36-39`). `cancelEditing` restaura
  `editedTitulo` para `task.titulo` e sai do modo de edição
  (`Task.jsx:15-18`) — como o `<h3>` volta a exibir `task.titulo` (que não
  foi alterado no backend), o título exibido é o original.
- [x] `dia_atividade` e `importante` não são alterados pela edição de
  título — o payload enviado ao backend só contém `{ titulo: novoTitulo }`
  (`App.jsx:133-134`); no controller, `Tarefas.update({ titulo }, { where:
  { uuid } })` (`api/controllers/tarefas.js:117-121`) só grava o campo
  `titulo`. No frontend, o merge do estado local preserva os demais campos:
  `{ ...task, titulo: data.titulo }` (`App.jsx:157`).
- [x] Backend expõe rota para atualizar título pelo uuid, retornando a
  tarefa atualizada em sucesso — `PUT /api/tarefas/update_titulo/:uuid`
  registrada em `api/routes/tarefas.js:55-62`, delega para
  `controller.update_titulo`, que responde `res.send(data)` com a tarefa
  recarregada via `findByPk` (`api/controllers/tarefas.js:123-127`).
- [x] uuid inexistente responde 404 com mensagem no mesmo padrão de `find`
  e `delete` — em `update_titulo`, se `findByPk(uuid)` retorna nulo, a rota
  responde `res.status(404).send({ message: "Tarefa não encontrada." })`
  (`api/controllers/tarefas.js:127-131`), string idêntica à usada em
  `find` (linha 43-45) e `delete` (linha 68-70). Confirmado também por
  teste automatizado (`tests/unit/controllers/tarefas.test.js:239-252`).
- [x] Título vazio/ausente no backend é rejeitado e não persiste — a
  validação ocorre antes do `Tarefas.update`: `const titulo = typeof
  req.body.titulo === "string" ? req.body.titulo.trim() : ""` seguida de
  `if (!titulo) return res.status(400)...` (`api/controllers/tarefas.js:
  109-115`), cobrindo tanto string vazia/whitespace quanto campo ausente
  (`typeof undefined !== "string"` → `titulo = ""`). Os testes automatizados
  confirmam que `mockTarefas.update` NÃO é chamado nesses casos
  (`tests/unit/controllers/tarefas.test.js:255-282`, asserts
  `expect(mockTarefas.update).not.toHaveBeenCalled()`), validando que a
  persistência realmente não ocorre.

## Sobre o teste automatizado novo (`update_titulo` describe block)
Revisei os 5 testes em `tests/unit/controllers/tarefas.test.js:226-302`:
- "deve atualizar o título com sucesso": envia `titulo: '  Novo título  '`
  e verifica que `Tarefas.update` foi chamado com o valor já trimado
  (`'Novo título'`) e que a resposta é o objeto retornado por `findByPk`.
  Assert correto e específico (não é só "foi chamado", checa o argumento
  exato).
- "404 quando tarefa não existe": `findByPk` mockado para `null`, checa
  `res.status(404)` e mensagem exata. Correto.
- Dois testes de "400 quando título vier vazio/ausente": checam
  `res.status(400)`, mensagem exata, e — importante — que
  `Tarefas.update` não foi chamado, provando que não houve tentativa de
  persistir título vazio. Correto e bate com o critério de aceite.
- "erro 500 ao falhar": `update` rejeitado, checa 500 com a mensagem do
  erro. Consistente com o padrão dos demais controllers.

Os mocks (`initializeModels`, `mockTarefas.update/findByPk`) seguem o
mesmo padrão dos blocos `describe` já existentes (`create`, `find`,
`delete`, `update_priority`) no mesmo arquivo, que presumivelmente já
passam hoje (não foram alterados neste diff). Não consegui executar
`npm test` para confirmar em runtime (Node/npm indisponíveis no
ambiente), mas a leitura estática não encontrou incoerência entre os
asserts e o comportamento do controller.

## Bugs encontrados
Nenhum bug que viole os critérios de aceite. Duas observações menores,
fora do escopo estrito da história mas que valem nota para o dev:

1. **Ordem update-then-check em `update_titulo`** (`api/controllers/
   tarefas.js:117-131`): o `Tarefas.update` é executado antes de
   verificar se a tarefa existe (mesmo padrão de `update_priority`, não é
   regressão nova). Como o `where: { uuid }` não casa com nenhuma linha
   quando o uuid é inválido, o `UPDATE` afeta 0 linhas e não lança erro —
   então o comportamento funcional (404 correto) não é afetado. Não é bug,
   apenas uma chamada UPDATE desnecessária em caso de uuid inexistente,
   já presente no padrão herdado de `update_priority`.
2. **Mensagem de erro no frontend em caso de falha HTTP** (`App.jsx:
   145-147`): quando `!res.ok`, o código lança `new Error(\`HTTP
   ${res.status}: ${res.statusText}\`)` em vez de usar `data.message`
   retornado pelo backend (ex.: "O título da tarefa é obrigatório." ou
   "Tarefa não encontrada."). O log de erro (`addLog('ERROR', ...)`)
   mostra então uma mensagem genérica de HTTP em vez da mensagem de
   negócio. Isso não viola nenhum critério de aceite (a validação client-
   side já impede o envio de título vazio antes de chegar a esse ponto,
   e não há critério exigindo que a mensagem do backend apareça na UI
   para esse endpoint), mas é uma pequena inconsistência de UX que pode
   valer a pena registrar para o dev considerar.

## Veredito
APROVADO
