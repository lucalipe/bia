# Calendário para escolher a data/prazo da tarefa

## Contexto
Hoje, no formulário "Adicionar Tarefa" (`client/src/components/AddTask.jsx`),
o campo "Data/Prazo" é um `<input type="text">` de texto livre: o usuário
digita qualquer valor, sem validação de formato. Se o campo fica vazio, o
front preenche automaticamente com a data atual no formato `dd/mm/aaaa`
(`new Date().toLocaleDateString('pt-BR')`). O valor digitado é enviado como
string para o backend (`POST /api/tarefas`, campo `dia_atividade`) e
persistido sem transformação — no model `Tarefas`
(`api/models/tarefas.js`), `dia_atividade` é `DataTypes.STRING`.

Na listagem de tarefas (`client/src/components/Task.jsx`), a data é apenas
exibida como texto (`📅 {task.dia_atividade}`); não existe hoje nenhuma tela
ou botão para editar a data de uma tarefa já criada — só é possível definir
a data no momento da criação.

Por ser texto livre, o usuário pode digitar qualquer coisa (datas
inválidas, formatos inconsistentes, texto que não é data). O pedido é
trocar essa digitação livre por um seletor visual de calendário, reduzindo
erro de digitação e formato.

**Restrição explícita do usuário:** o campo `dia_atividade` continua
`STRING` no model e no banco. Esta história não propõe migration nem
mudança de schema — a mudança é só na forma como o valor é capturado na
interface.

## História
Como usuário da BIA, quero escolher a data/prazo da tarefa em um calendário
visual ao criar a tarefa, em vez de digitar a data em texto livre, para que
eu não erre o formato ou digite uma data inválida.

## Critérios de aceite
- [ ] No formulário "Adicionar Tarefa", o campo "Data/Prazo" abre um
      seletor de calendário visual (ex.: ao clicar/focar no campo), em vez
      de aceitar digitação de texto livre.
- [ ] Ao selecionar uma data no calendário, o campo passa a exibir a data
      escolhida no formato `dd/mm/aaaa` — o mesmo formato já usado hoje pela
      BIA (tanto no valor padrão preenchido automaticamente quanto nas
      tarefas já existentes na listagem).
- [ ] Não é possível digitar um valor de data livre no campo; a única forma
      de definir a data é selecionando-a no calendário (ou deixando o campo
      em branco).
- [ ] Se nenhuma data for selecionada, o comportamento atual é mantido: a
      tarefa é criada com a data do dia atual, no formato `dd/mm/aaaa`.
- [ ] O valor enviado ao backend no campo `dia_atividade` continua sendo uma
      string de texto, sem nenhuma mudança de tipo/formato no model
      (`api/models/tarefas.js`) ou no banco — nenhuma migration é criada
      por esta história.
- [ ] Uma tarefa criada com uma data escolhida pelo calendário aparece
      corretamente na listagem (`Task.jsx`), exibindo a mesma data
      selecionada no formato `dd/mm/aaaa`.
- [ ] Tarefas já existentes no banco, criadas antes desta mudança, continuam
      sendo exibidas normalmente na listagem, sem erro, independente de já
      estarem ou não no formato `dd/mm/aaaa`.

## Fora de escopo
- Edição da data de uma tarefa já criada — essa ação não existe hoje na
  BIA e não está sendo criada por esta história (hoje só é possível
  definir a data na criação da tarefa).
- Mudança do tipo/formato de armazenamento do campo `dia_atividade` no
  banco (continua `STRING`, sem migration).
- Validação de regra de negócio sobre datas passadas ou futuras (ex.:
  impedir escolher uma data que já passou) — o seletor aceita qualquer
  data, como o campo de texto livre aceitava hoje.
- Internacionalização do calendário para outros idiomas/formatos de data —
  segue o padrão pt-BR já usado na aplicação.

## Suposições e perguntas abertas
- Assumi que a data escolhida no calendário deve ser convertida para o
  formato `dd/mm/aaaa` antes de ser enviada ao backend e exibida na
  listagem, para manter consistência com o valor padrão atual e com as
  tarefas já existentes no banco (que estão nesse formato). A forma técnica
  de fazer essa conversão (ex.: usar `type="date"` nativo do HTML e
  converter o valor, ou usar uma biblioteca de calendário que já formate
  dessa forma) é decisão do dev.
- Não há hoje nenhuma UI para editar a data de uma tarefa existente, então
  não criei critério de aceite sobre isso — se o time quiser esse fluxo
  também, é uma história separada.
