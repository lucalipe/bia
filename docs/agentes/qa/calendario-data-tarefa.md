# QA: Calendário para escolher a data/prazo da tarefa

## Método usado
Dinâmico (segunda rodada — reteste pós-correção). Node v24.19.0 / npm
11.17.0 disponíveis no ambiente. O worktree já tinha `node_modules`
instalado em `client/` e um servidor Vite (`npm run dev`, porta 5173) já
rodando a partir deste mesmo diretório (`E:\Projetos\estudo-aws\bia-wt-calendario-data-tarefa\client`,
confirmado via `Get-CimInstance Win32_Process` na linha de comando do
processo). Reaproveitei esse servidor e testei no navegador real (via
Browser MCP): cliques reais de mouse (gesto de usuário genuíno), leitura de
console, DOM/accessibility tree e log de rede/aplicação.

Não havia backend (`:8080`) nem Docker disponíveis (mesma limitação da
rodada anterior — `docker` não está instalado neste ambiente), então não foi
possível validar o fluxo fim-a-fim de persistência/listagem contra um banco
real. Isso não impede validar o comportamento do formulário no client, que é
o núcleo desta história e do bug reportado na rodada anterior.

Limitação técnica encontrada nesta rodada: o calendário nativo do
`input[type=date]`, quando aberto via `showPicker()`, é um popup renderizado
pelo motor do navegador fora da árvore normal de pintura da página — nas
minhas tentativas de screenshot após o clique, o popup não aparece
capturado (limitação conhecida de screenshots via protocolo remoto para
widgets nativos do SO/navegador, não um sinal de que o picker não abriu).
Por isso, a confirmação de que o picker realmente abre foi feita de forma
indireta, mas rigorosa: (a) ausência de qualquer `NotAllowedError` no
console em múltiplos cliques reais (antes da correção, o erro aparecia de
forma consistente e imediata a cada clique); (b) simulação do resultado do
usuário escolher uma data no `input[type=date]` nativo (setando o valor via
`Object.getOwnPropertyDescriptor` + `dispatchEvent('input'/'change')`, que é
exatamente o par de eventos que o navegador dispara quando o usuário
seleciona uma data no picker nativo) e verificação de que o campo visível e
o payload de submit refletem corretamente o valor escolhido.

## Critérios de aceite
- [x] **Campo abre um seletor de calendário visual ao clicar, sem erro** —
  CONFIRMADO. Código: `client/src/components/AddTask.jsx:74` registra
  `onClick={abrirCalendario}` no input de texto visível; a chamada
  duplicada em `onFocus` (presente na rodada anterior, linha 75 do relatório
  de bug) foi removida — confirmado por leitura de código (não existe mais
  `onFocus` no JSX) e por `git diff`/dev report descrevendo a remoção.
  Dinamicamente: cliquei 2x no campo "Data/Prazo" (inclusive após clicar
  antes em outro ponto da página, para garantir que o campo não estava
  focado) e em nenhuma das vezes o console registrou
  `NotAllowedError`/`showPicker` — different do comportamento reproduzido na
  rodada anterior, onde o erro aparecia em 100% das tentativas. `abrirCalendario`
  (`AddTask.jsx:20-26`) chama `showPicker()` só a partir de um clique real de
  mouse, que é um gesto de usuário válido para essa API.
- [x] **Ao selecionar uma data, o campo exibe `dd/mm/aaaa`** — CONFIRMADO
  dinamicamente. Simulei a seleção de `2026-12-25` no `input[type=date]`
  escondido (disparando os eventos `input`/`change` que o navegador dispara
  ao usuário escolher uma data no picker nativo) e o campo de texto visível
  passou a exibir `25/12/2026` imediatamente — `formatarDataBR`
  (`AddTask.jsx:6-10`) e `onDateChange` (linhas 28-32) funcionam como
  esperado.
- [x] **Não é possível digitar texto livre; único jeito de definir a data é
  pelo calendário (ou deixar em branco)** — CONFIRMADO dinamicamente. Após
  o campo já exibir `25/12/2026` (via seleção simulada), cliquei nele e
  digitei `texto livre 99/99/9999` via teclado real — o valor do campo
  permaneceu `25/12/2026`, sem nenhuma alteração (confirma `readOnly` em
  `AddTask.jsx:73` funcionando na prática, não só no atributo). Como o
  bug do `NotAllowedError` foi corrigido, essa restrição deixou de ser uma
  regressão: agora o usuário tem uma forma real de escolher outra data (o
  calendário), diferente da rodada anterior onde `readOnly` + calendário
  quebrado deixavam o usuário sem nenhuma opção.
- [x] **Se nenhuma data for selecionada, cria com a data atual em
  `dd/mm/aaaa`** — CONFIRMADO dinamicamente. Preenchi só o título ("Teste
  fallback retest"), deixei "Data/Prazo" em branco e submeti; o log da
  aplicação mostrou `Payload: {"titulo":"Teste fallback retest",
  "dia_atividade":"27/09/2026","importante":false}` — data de hoje
  (27/09/2026, conforme confirmado no system prompt) no formato correto. O
  `POST` falhou depois por não haver backend rodando
  (`ERR_CONNECTION_REFUSED`), o que é esperado e não é responsabilidade
  desta história.
- [x] **`dia_atividade` continua string, sem migration/mudança de schema** —
  CONFIRMADO por leitura de código nesta rodada: `git diff HEAD --
  api/models/tarefas.js api/controllers/tarefas.js` não retorna nada
  (arquivos intocados); `grep dia_atividade api/models/tarefas.js` mostra
  `dia_atividade: DataTypes.STRING` (linha 9, inalterado); `git status
  --porcelain database/` não lista nenhuma alteração/arquivo novo — nenhuma
  migration foi criada.
- [x] **Uma tarefa criada com data escolhida pelo calendário aparece
  corretamente na listagem** — CONFIRMADO por combinação de teste dinâmico
  parcial + leitura de código. Dinamicamente, confirmei que o payload
  enviado ao backend contém a data exata escolhida no formato correto
  (`{"titulo":"Teste QA retest calendario","dia_atividade":"25/12/2026",...}`,
  capturado no log da aplicação ao submeter com a data `25/12/2026`
  selecionada). Não foi possível persistir e recarregar a listagem de fato
  (sem backend/Docker disponíveis neste ambiente — mesma limitação da
  rodada anterior). Por leitura de código, `client/src/components/Task.jsx`
  não foi alterado por esta história (confirmado via `git diff` vazio) e
  continua exibindo `task.dia_atividade` como texto puro
  (`{task.dia_atividade || "Sem data definida"}`), então o valor enviado
  seria exibido corretamente. Como o valor enviado está confirmadamente
  correto e a exibição não foi tocada, considero o critério atendido, com a
  ressalva de que o ciclo completo (persistir → buscar do banco → exibir)
  não foi exercitado ao vivo.
- [x] **Tarefas antigas em qualquer formato continuam sendo exibidas sem
  erro** — CONFIRMADO por leitura de código: `Task.jsx` faz apenas
  interpolação de string direta (`task.dia_atividade`), sem parsing nem
  validação de formato, e não foi tocado pelo dev nesta história (nem na
  correção pós-QA).

## Bugs encontrados
Nenhum bug bloqueante nesta rodada. O bug crítico da rodada anterior
(`NotAllowedError` ao clicar no campo, por `showPicker()` sendo chamado
também a partir de `onFocus`) não se reproduziu em nenhuma das tentativas:
cliquei no campo "Data/Prazo" múltiplas vezes, em situações diferentes
(logo após carregar a página, depois de clicar em outro ponto da tela
antes), e o console nunca registrou o erro. A correção do dev (remover
`onFocus={abrirCalendario}`, mantendo só `onClick`) resolveu a causa raiz
identificada na rodada anterior.

### Limitação de verificação (não é bug, é registrado por transparência)
Não consegui confirmar *visualmente* (via screenshot) que o popup nativo do
calendário aparece na tela, porque esse tipo de widget nativo não é
capturado pela ferramenta de screenshot remota usada neste ambiente de QA.
Compensei isso validando o efeito do `showPicker()` (ausência de exceção) e
o comportamento downstream (seleção → formatação → payload) via simulação
dos eventos que o navegador dispara quando o usuário realmente escolhe uma
data no picker. Isso cobre o critério de aceite com um grau de confiança
alto, mas registro a limitação para transparência.

### Observação fora do escopo desta história (já reportada na rodada anterior, ainda presente)
O texto do botão de submit em `AddTask.jsx:99` continua com conteúdo
estranho, não relacionado à tarefa em si: `"Adicionar Task dominio CDN com
cloudfront + Agentes de IA & Multi Agentic"`. Confirmado via leitura de
código que essa linha não foi tocada nesta rodada (nem na correção
pós-QA). Não é um bug introduzido por esta história, mas segue visível na
tela para qualquer usuário — reportando de novo para não se perder.

## Veredito
APROVADO.

A correção aplicada pelo dev (remover a chamada duplicada de
`showPicker()` no `onFocus`, mantendo apenas `onClick`) resolveu o bug
crítico que causou a reprovação anterior. Testei de forma dinâmica e
reproduzível: nenhum `NotAllowedError` em múltiplos cliques reais no campo,
a conversão de data selecionada para `dd/mm/aaaa` funciona corretamente, a
digitação livre continua bloqueada (e agora isso não é mais uma regressão,
já que o calendário é uma alternativa funcional), o fallback para a data
atual quando o campo fica em branco funciona e envia o formato correto, e
não há nenhuma mudança em backend/model/migrations. A única ressalva é que
o ciclo fim-a-fim contra um banco real (persistir e depois listar) não foi
exercitado ao vivo por falta de Docker/backend disponíveis neste ambiente —
mas isso é uma limitação de ambiente, não um problema identificado no
código, e a lógica de exibição (`Task.jsx`) está confirmadamente intocada e
correta para qualquer formato de string.
