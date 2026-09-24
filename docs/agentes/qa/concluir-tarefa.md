# QA: Marcar tarefa como concluída e bloquear edição de título

## Método usado
Estático — li o código linha a linha contra cada critério de aceite. Verifiquei
`node -v` e `npm -v` neste ambiente (Git Bash no Windows) e ambos retornaram
`command not found`; não há Node.js/npm/Docker disponíveis nesta sessão, então
não foi possível rodar `npm test`, subir a aplicação (`npm start`) nem testar
pelo navegador. Usei `git diff main` para isolar exatamente o que mudou e li
os arquivos completos (não só o diff) para entender o contexto ao redor de
cada trecho alterado.

Arquivos lidos na íntegra: `api/controllers/tarefas.js`,
`api/routes/tarefas.js`, `api/models/tarefas.js`,
`database/migrations/20260923000000-add-concluida-tarefas.js`,
`database/migrations/20210924000838-criar-tarefas.js` (confirmando que não foi
tocada — `git diff` vazio),  `client/src/components/Task.jsx`,
`client/src/components/Tasks.jsx`, `client/src/App.jsx` (funções
`toggleReminder`, `toggleConcluida`, `fetchTask`), `client/src/index.css` e
`tests/unit/controllers/tarefas.test.js` na íntegra.

## Critérios de aceite

### Marcar/desmarcar como concluída
- [x] Controle visível e distinto de "importante"/"editar" — `client/src/components/Task.jsx:85-106`: botão `.task-conclude` (ícone `FaCheckCircle`/`FaRegCircle`) é um elemento separado de `.task-edit` (linhas 92-99) e `.task-priority` (linhas 100-106).
- [x] Não altera `importante` nem `dia_atividade` — `client/src/App.jsx:132-169` (`toggleConcluida`): busca a tarefa atual via `fetchTask`, faz spread de todos os campos e só inverte `concluida`; o PUT em `api/controllers/tarefas.js:152-176` (`update_conclusao`) grava `req.body` como veio, então os demais campos chegam com os mesmos valores. Mesmo padrão já usado por `toggleReminder`/`update_priority`, que já está em produção sem essa crítica — não é regressão nova.
- [x] Diferenciação visual — `client/src/index.css:151-153` (`.task.completed` — borda azul + opacidade 0.7) e `:167-169` (`.task.completed h3` — texto riscado), visualmente distinto de `.task.reminder` (borda verde, linha 147-149).
- [x] Desmarcar pelo mesmo controle e liberar edição — mesmo botão `.task-conclude` alterna (`Task.jsx:86-91`); `task-edit` usa `disabled={task.concluida}` (`Task.jsx:95`), então ao `concluida` virar `false` o botão volta a ficar habilitado.
- [x] Rota backend para alternar status por `uuid`, retornando a tarefa atualizada, no padrão de `update_priority` — `api/controllers/tarefas.js:152-176` (`update_conclusao`) é estruturalmente idêntica a `update_priority` (linhas 79-103); rota registrada em `api/routes/tarefas.js:64-71` (`PUT /api/tarefas/update_conclusao/:uuid`).
- [x] 404 com mensagem de erro se uuid não existe, no padrão de `find`/`delete`/`update_titulo` — `api/controllers/tarefas.js:163-170`: após `Tarefas.update` (que não lança erro para 0 linhas afetadas), busca via `findByPk`; se `null`, `res.status(404).send({ message: "Tarefa não encontrada." })` — mesma mensagem usada em `find` (linha 44), `delete` (linha 69) e `update_titulo` (linhas 119-121, 141-143). Coberto também pelo teste `tests/unit/controllers/tarefas.test.js:355-368`.

### Bloqueio de edição de título quando concluída (UI)
- [x] Botão de editar desabilitado quando concluída — `Task.jsx:92-99`: `disabled={task.concluida}` e `title` explicando o motivo. Reforço defensivo em `startEditing` (`Task.jsx:10-14`): `if (task.concluida) return;` antes de entrar em modo de edição, cobrindo mesmo um clique que burlasse o `disabled`.
- [x] Desmarcando a tarefa, o botão volta a ficar disponível — mesma prop `disabled={task.concluida}` reage a `task.concluida === false` automaticamente; não há estado interno separado que precise ser resetado.

### Bloqueio de edição de título quando concluída (API)
- [x] `PUT /api/tarefas/update_titulo/:uuid` em tarefa concluída rejeita, não altera `titulo` no banco, responde 4xx com mensagem clara — `api/controllers/tarefas.js:117-128`: busca a tarefa via `findByPk` antes de qualquer `update`; se `tarefa.concluida` é truthy, retorna `res.status(409).send({ message: "Tarefa concluída não pode ter o título editado." })` e a função retorna (`return`) sem nunca chamar `Tarefas.update`. Confirmado pelo teste `tests/unit/controllers/tarefas.test.js:261-274`, que também verifica `expect(mockTarefas.update).not.toHaveBeenCalled()`.
- [x] Bloqueio vale independente da origem da chamada — o check é feito dentro do próprio `update_titulo` no controller, antes de qualquer lógica de UI; qualquer chamador HTTP (curl, Postman, frontend) passa pelo mesmo código, então o bloqueio é efetivo para todos.
- [x] Comportamento para tarefa não concluída permanece o mesmo — para o caso de sucesso, o fluxo final é idêntico ao anterior: `Tarefas.update({ titulo }, ...)` → `refreshCache()` → `findByPk` → `res.send(data)` (`api/controllers/tarefas.js:130-144`), sem nenhuma mudança de resposta observável. A única diferença interna é que agora, no caso de uuid inexistente, o 404 é retornado antes de chamar `Tarefas.update`/`refreshCache` (evitando uma chamada desnecessária ao banco/cache) em vez de depois — mas a resposta HTTP final (status 404 + mesma mensagem) é idêntica à de antes, então não há regressão observável pelo cliente da API. O teste de 404 foi ajustado de acordo (`tests/unit/controllers/tarefas.test.js:245-259`, com a nova asserção `update).not.toHaveBeenCalled()`), e o teste de erro 500 foi ajustado para mockar `findByPk` retornando uma tarefa não concluída antes do `update` falhar (linha 304-317), continuando a validar o mesmo comportamento de erro 500.
- [x] `update_conclusao` continua funcionando após o título já estar bloqueado — `update_conclusao` (`api/controllers/tarefas.js:152-176`) não tem nenhuma checagem de `concluida` antes de aplicar `req.body`; ele sempre executa o update recebido, então alternar `concluida` (inclusive voltar para `false`) continua funcionando independentemente do bloqueio de título.

### Fora de escopo (verificação de não regressão)
- [x] `update_priority` (importante) não foi alterado — `git diff main -- api/controllers/tarefas.js` mostra zero mudanças nas linhas de `update_priority` (79-103); nenhuma checagem de `concluida` foi adicionada ali.
- [x] Migration original (`database/migrations/20210924000838-criar-tarefas.js`) não foi tocada — `git diff main` para esse arquivo retornou vazio; o novo campo foi adicionado via migration incremental separada (`20260923000000-add-concluida-tarefas.js`), seguindo o padrão pedido pelo PO.
- [x] `DELETE /api/tarefas/:uuid` não foi alterado — sem diff nessas linhas.

## Atualização — verificação dinâmica

Node.js foi instalado nesta máquina após a análise estática acima. Rodado
`npm install` seguido de `npx jest tests/unit/controllers/tarefas.test.js`
na branch `feature/concluir-tarefa`:

```
Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
```

Os 3 testes que cobrem diretamente o comportamento crítico desta história
passaram de fato em execução real, não só por leitura:
- `update_titulo › deve retornar 409 quando a tarefa está concluída`
- `update_conclusao › deve marcar uma tarefa como concluída com sucesso`
- `update_conclusao › deve desmarcar uma tarefa concluída com sucesso`

Isso resolve a ressalva original sobre o backend/lógica não ter sido
executado. A única verificação que continua pendente é a de UI renderizada
num navegador real (não há suíte de teste de componente React no projeto) —
mantida como observação, não como bloqueio.

## Bugs encontrados
Nenhum bug funcional encontrado na leitura estática. Duas observações que não
considero bugs, mas registro para conhecimento:

1. O payload enviado por `toggleConcluida`/`toggleReminder` ao backend inclui
   o objeto inteiro da tarefa (incluindo `uuid`, `createdAt`, `updatedAt`
   etc.), não apenas o campo que está sendo alterado. Isso é o mesmo padrão
   já usado hoje por `toggleReminder`/`update_priority` (pré-existente, fora
   do escopo desta história), então não é uma regressão introduzida por esta
   mudança — só não é o desenho mais defensivo possível para uma rota nova.
2. Não há suíte de teste de componente React no projeto (só `tests/unit/controllers`),
   então os critérios de UI (botão desabilitado, diferenciação visual, CSS)
   só puderam ser verificados por leitura de código/JSX/CSS, não por teste
   automatizado nem renderização real. Isso está alinhado com o que o próprio
   dev já registrou como pendência no relatório dele.

## Veredito
APROVADO

A ressalva original (nenhum teste executado de fato) foi resolvida pela
verificação dinâmica acima — os 23 testes automatizados passaram, incluindo
os 3 que cobrem diretamente o bloqueio cruzado. Recomenda-se ainda validar
manualmente pela UI depois do deploy (marcar/desmarcar, tentar editar título
de tarefa concluída, verificar CSS aplicado), como já é praxe neste
projeto após o merge.
