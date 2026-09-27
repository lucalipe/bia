# Gráfico de tarefas importantes x normais

## Contexto
Hoje a listagem principal de tarefas (`Tasks.jsx`/`Task.jsx`) mostra cada
tarefa individualmente, com um botão de estrela para marcar/desmarcar como
"importante" (campo `importante`, tipo `BOOLEAN`, já existente no model
`api/models/tarefas.js` e já manipulado pela rota
`PUT /api/tarefas/update_priority/:uuid`). Não existe hoje nenhuma visão
agregada — o usuário não tem como saber rapidamente quantas tarefas estão
marcadas como importantes em relação ao total.

A API já expõe `GET /api/tarefas`, que retorna todas as tarefas (incluindo o
campo `importante`) no corpo da resposta (`data`, ou `response.data` quando
cache está habilitado). Não é necessário nenhum endpoint novo nem campo novo
no banco: "importante x normal" é a contagem de `importante = true` vs
`importante = false/null` sobre o conjunto de tarefas já carregado.

O app já tem um precedente de tela separada acessada por rota própria: a
página "/about" (`About.jsx`), roteada em `App.jsx` via `react-router-dom` e
acessível a partir do `Header`. O gráfico deve seguir esse mesmo padrão em
vez de aparecer misturado na listagem principal.

## História
Como usuário da BIA, quero acessar um gráfico simples de colunas/barras que
mostre quantas tarefas estão marcadas como importantes e quantas estão como
normais, para ter uma visão geral de prioridade das minhas tarefas sem
precisar contar manualmente na lista.

## Critérios de aceite
- [ ] Existe um link/botão visível na interface principal (junto à listagem
      de tarefas ou no cabeçalho, como já ocorre com o acesso à tela
      "Sobre") que leva a uma tela ou seção separada dedicada ao gráfico.
- [ ] O gráfico **não aparece por padrão misturado na tela de listagem
      principal** — só é exibido depois que o usuário acessa esse link.
- [ ] A tela do gráfico exibe duas colunas/barras: uma para "Importante"
      (tarefas com `importante = true`) e outra para "Normal" (tarefas com
      `importante = false` ou sem valor definido).
- [ ] Cada coluna/barra mostra o número exato de tarefas na categoria (ex:
      via rótulo numérico visível acima, dentro ou ao lado da barra).
- [ ] A contagem soma **todas as tarefas cadastradas**, concluídas ou não
      (ver suposição abaixo).
- [ ] A contagem reflete os dados atuais da API (`GET /api/tarefas`) no
      momento em que a tela do gráfico é aberta — não é um valor fixo/mock.
- [ ] Se não houver nenhuma tarefa cadastrada, a tela do gráfico exibe uma
      mensagem informativa (ex: "Nenhuma tarefa cadastrada ainda") em vez de
      um gráfico vazio ou quebrado.
- [ ] Existe uma forma de voltar da tela do gráfico para a listagem
      principal (ex: link/botão de voltar, ou navegação padrão do
      cabeçalho).

## Fora de escopo
- Qualquer filtro adicional no gráfico (por data, por status de conclusão,
  por período etc.) — é só a contagem simples importante x normal.
- Criação de endpoint novo no backend — a contagem é feita a partir dos
  dados já retornados por `GET /api/tarefas`.
- Qualquer campo novo no model `Tarefas` ou migration nova.
- Gráficos de outros tipos (pizza, linha, histórico ao longo do tempo).
- Exportação do gráfico (imagem, PDF, etc.).
- Infraestrutura/deploy — não há impacto de infraestrutura nesta história.

## Suposições e perguntas assumidas
- **Suposição adotada:** a contagem considera todas as tarefas, inclusive as
  já concluídas (`concluida = true`). Se a intenção for mostrar só tarefas
  ainda pendentes, isso muda o critério de aceite e deve ser confirmado
  antes do dev começar.
- **Suposição adotada:** o rótulo da categoria sem `importante` marcado é
  "Normal" (cobrindo tanto `false` quanto `null`/`undefined`, já que o campo
  é opcional no banco).
