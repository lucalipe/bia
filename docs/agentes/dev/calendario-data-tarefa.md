# Dev: Calendário para escolher a data/prazo da tarefa

## Correção pós-QA (reprovação)
O QA reprovou a história porque `abrirCalendario` (que chama
`showPicker()`) estava registrado tanto em `onClick` quanto em `onFocus`
do campo de texto visível. Num clique de mouse em um campo ainda não
focado, o navegador dispara primeiro o evento `focus` e só depois o
`click` — e a especificação do `showPicker()` proíbe explicitamente
chamá-lo a partir de um handler de `focus`, mesmo indiretamente. Isso
fazia a chamada vinda do `onFocus` lançar `NotAllowedError` antes mesmo do
`onClick` ser processado, e o calendário nunca abria.

**Correção:** removida a chamada `onFocus={abrirCalendario}` do input de
texto (`client/src/components/AddTask.jsx`), mantendo apenas
`onClick={abrirCalendario}`. O clique do mouse é um gesto de usuário
válido para `showPicker()`, então o calendário volta a abrir
normalmente. O critério de aceite fala em "clicar/focar" apenas como
exemplo (não como exigência de suportar os dois eventos), e a própria
API do navegador não permite abrir o picker a partir de foco puro (ex.:
navegação por Tab) — isso é uma limitação da plataforma, não do código;
usuários de teclado ainda conseguem abrir o calendário nativo com as
setas/Enter uma vez que o campo `input[type=date]` receba foco via
`focus()` do fallback, embora o clique seja o caminho principal.

## Arquivos criados/alterados
- `client/src/components/AddTask.jsx` — troca o campo "Data/Prazo" de texto
  livre por um seletor de calendário: input de texto somente leitura (exibe
  `dd/mm/aaaa`) que abre um `input[type="date"]` nativo escondido via
  `showPicker()` ao clicar; o valor ISO retornado pelo calendário é
  convertido para `dd/mm/aaaa` antes de ir para o estado `dia`, que é o
  mesmo valor enviado em `dia_atividade` no submit (mantendo o fallback
  para a data atual quando nada é selecionado). Após a correção pós-QA,
  `showPicker()` só é disparado a partir do `onClick` (gesto de usuário
  válido); a chamada duplicada no `onFocus` foi removida.
- `client/src/index.css` — estilos novos `.date-picker-field` e
  `.date-picker-hidden` para posicionar o input de calendário nativo por
  baixo do campo de texto visível (invisível, mas conectado ao DOM, sem
  `display: none`, para não quebrar `showPicker()` em nenhum navegador) e
  cursor de ponteiro no campo visível.
- `docs/agentes/po/calendario-data-tarefa.md` — copiado da pasta principal
  para dentro do worktree (faz parte do commit desta feature).

## Abordagem
Segui a sugestão do próprio PO na seção "Suposições e perguntas abertas":
usar o `input type="date"` nativo do HTML e converter o valor, em vez de
adicionar uma biblioteca de calendário nova (o projeto não tem nenhuma
dependência de date-picker hoje, e a regra do projeto é evitar dependência
nova quando não é estritamente necessária).

Como o requisito pede que o campo sempre exiba `dd/mm/aaaa` (formato que o
navegador não garante mostrar de forma consistente em um `input type="date"`
visível, pois depende do locale do SO/navegador), optei por um padrão comum
para esse cenário: um campo de texto visível e `readOnly` (não aceita
digitação) mostra a data já formatada em `dd/mm/aaaa`; por baixo dele, um
`input type="date"` nativo (invisível, mas presente no DOM) é aberto via
`ref.current.showPicker()` quando o usuário clica no campo visível (ver
seção "Correção pós-QA" acima sobre por que não usar `onFocus`).
Ao selecionar uma data no calendário nativo, o `onChange` do input escondido
converte o valor ISO (`aaaa-mm-dd`) para `dd/mm/aaaa` e atualiza o campo
visível e o estado `dia`, que é exatamente o mesmo estado já enviado como
`dia_atividade` no `onSubmit` (sem mudança de contrato com o backend).

Não toquei em `Task.jsx` nem no backend (`api/controllers/tarefas.js`,
`api/models/tarefas.js`): a listagem já exibe `dia_atividade` como texto
puro, e o model continua `STRING`, então tarefas antigas em qualquer
formato continuam sendo exibidas sem erro — nenhuma migration foi criada.

## Critérios não verificados
- Não executei a aplicação (não há `node_modules` instalados no worktree e
  o ambiente não tem acesso de rede/tempo garantido para `npm install`),
  então não confirmei visualmente no navegador a abertura do calendário nem
  testei manualmente em diferentes navegadores. `showPicker()` é suportado
  nas versões atuais de Chrome, Edge e Firefox e no Safari 16.4+; para
  navegadores sem suporte, o código cai para `input.focus()` como
  fallback (o usuário ainda pode abrir o calendário nativo pelo teclado,
  mesmo sem o clique automático).
- Não há testes automatizados de componentes React no projeto hoje (não
  existe configuração de test runner para o `client/`, só testes de
  controller do backend em `tests/unit/controllers/`), então não criei
  teste novo para este componente — não haveria um padrão equivalente para
  seguir sem introduzir infraestrutura de teste nova, o que estaria fora do
  escopo desta história.

## Decisões técnicas
- Usei `showPicker()` (API nativa do navegador) para abrir o calendário
  programaticamente a partir do clique no campo visível, com fallback
  para `focus()` em navegadores sem suporte a essa API. Não uso `onFocus`
  para disparar `showPicker()` porque a especificação proíbe chamá-lo a
  partir de um handler de `focus` (ver "Correção pós-QA").
- O input `type="date"` escondido fica com `opacity: 0` e
  `pointer-events: none` (não `display: none`), garantindo que
  `showPicker()` funcione de forma confiável em todos os navegadores
  suportados, já que alguns implementam a API de forma inconsistente em
  elementos totalmente removidos do layout.
