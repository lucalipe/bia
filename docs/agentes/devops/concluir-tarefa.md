# DevOps: Marcar tarefa como concluída e bloquear edição de título

## Modo A — Publicação da branch

### Pré-checagens
- Relatório de QA: `docs/agentes/qa/concluir-tarefa.md` — veredito **APROVADO**.
- Branch de trabalho: `feature/concluir-tarefa` (já criada pelo dev a partir de `main`), confirmado via `git branch --show-current`.
- `git status`/`git diff --stat` conferidos: as mudanças pendentes batiam exatamente com o que o relatório do dev (`docs/agentes/dev/concluir-tarefa.md`) descreve — migration nova, model, controller, rotas, componentes React, CSS e teste unitário. Nada fora de escopo.
- `git fetch origin` + comparação: `origin/main` não avançou além do ponto em que a branch foi criada (`git log feature/concluir-tarefa..origin/main` vazio) — não foi necessário merge/rebase.

### Commit publicado
- Branch: `feature/concluir-tarefa`
- Commit: `edd9b003d27b594dd6a26c048f17cdc7d06c619f`
- Mensagem: "Adiciona conclusao de tarefa e bloqueia edicao de titulo quando concluida"
- Push: `git push origin feature/concluir-tarefa` (nenhum push em `main`)

### Link para abrir o PR
https://github.com/lucalipe/bia/compare/main...feature/concluir-tarefa?expand=1

## Modo B — Verificação pós-merge em produção

### Contexto do merge
- PR mergeado manualmente em `main` por um humano. Commit de merge:
  `0202d6d2a3c9110282b45750f50d1a2982fd15cb` ("Merge pull request #1 from
  lucalipe/feature/concluir-tarefa"), contendo `edd9b00` ("Adiciona conclusao
  de tarefa e bloqueia edicao de titulo quando concluida").

### Pipeline `bia-prd`
Consultado via `aws codepipeline get-pipeline-state --name bia-prd --region us-east-1`,
execução `4e8af251-b810-45a8-85d3-37705c387b6d`. Todos os três estágios **Succeeded**:
- **Source:** Succeeded — GitHub, revisão `0202d6d2a3c9110282b45750f50d1a2982fd15cb`.
- **Build:** Succeeded — projeto `bia-build-prd`.
- **Deploy:** Succeeded — `Cluster: cluster-bia-alb service: service-bia-alb status: FINISHED`,
  task definition `task-def-bia-alb:19`.

### Estabilidade do ECS Service
`aws ecs describe-services --cluster cluster-bia-alb --services service-bia-alb`:
`desiredCount == runningCount == 2`, `pendingCount == 0`, um único deployment
`PRIMARY` com `rolloutState: COMPLETED` em `task-def-bia-alb:19`. Infra do
deploy em si está saudável.

### Verificação funcional em produção — FALHOU (incidente em produção)

Testado em `https://formacaoaws.openxtec.com.br`, tanto pela UI (browser)
quanto pela API diretamente (`curl`):

- **UI:** ao carregar a página, a lista mostra "Nenhuma tarefa por aqui" (lista
  vazia), apesar de existirem tarefas cadastradas. Cliquei no botão de marcar
  uma tarefa como concluída (`teste apos correcao cors`) — nada acontece
  visualmente. Inspecionando as network requests da aba: `GET
  /api/tarefas/<uuid>` retornou **500** duas vezes, corpo
  `{"message":"column \"concluida\" does not exist"}`.
- **API direta (`curl`):**
  - `GET https://formacaoaws.openxtec.com.br/api/tarefas` → **500**,
    `{"message":"column \"concluida\" does not exist"}`.
  - `PUT https://formacaoaws.openxtec.com.br/api/tarefas/update_titulo/<uuid>`
    (mesmo com uuid inexistente) → **500**,
    `{"message":"column \"concluida\" does not exist"}`.

**Causa raiz:** a migration nova (`database/migrations/20260923000000-add-concluida-tarefas.js`)
nunca foi executada contra o banco RDS de produção. O `buildspec.yml` do
projeto só faz build da imagem Docker e deploy no ECS — não tem nenhum passo
de `sequelize db:migrate`. O código da aplicação (já validado pelo QA) agora
sempre referencia a coluna `concluida` no model/queries, então **toda** rota
que toca a tabela `tarefas` está quebrada em produção agora, não só a
funcionalidade nova — isso é uma regressão que afeta o app inteiro (a listagem
de tarefas, que já existia, também está fora do ar).

**Não corrigido por este agente.** Rodar a migration contra o RDS de produção
é uma alteração de schema de banco de dados fora do escopo de uma publicação
de rotina deste agente (regra: não modificar infraestrutura/RDS como parte de
deploy de rotina, e não corrigir bugs encontrados na verificação — isso volta
para decisão humana). Reportando como incidente para ação imediata.

## Veredito final

**Pipeline: sucesso. ECS Service: saudável. Aplicação em produção: FORA DO AR
(incidente).** O deploy tecnicamente funcionou (imagem nova rodando, serviço
estável), mas a migration `20260923000000-add-concluida-tarefas.js` nunca foi
aplicada no RDS de produção. Resultado: qualquer chamada que toque a tabela
`tarefas` (incluindo a listagem básica, que já existia antes desta história)
retorna 500 com `column "concluida" does not exist`. Isso não é um bug de
código da feature — QA já validou a lógica e os testes automatizados passam
— é uma lacuna do processo de deploy (falta um passo de migration no
pipeline/checklist de release).

**Ação recomendada urgente:** um humano precisa rodar a migration pendente
contra o RDS de produção (ex.: `npx sequelize db:migrate` a partir de um
ambiente com acesso ao banco, como a EC2 `bia-dev` ou via ECS Exec na task
rodando), e depois disso vale re-testar tanto marcar/desmarcar tarefa como
concluída quanto o bloqueio de edição de título (UI e API) — nenhuma dessas
verificações pôde ser concluída aqui porque o app está indisponível para
qualquer operação na tabela `tarefas`.
