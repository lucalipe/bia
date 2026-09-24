# DevOps: Editar título de uma tarefa existente

> Reconstruído a partir do relatório original do agente `devops` (a
> publicação já tinha acontecido antes da reorganização dos outputs em
> `docs/agentes/`).

## Commit publicado

`99b6927ef7fb669ea9b92e11f3cc7c4bc148b15c` — "Adiciona edição de título de
tarefa (backend e frontend)". Não houve novo commit/push nesta execução: a
árvore de trabalho já estava limpa e `main` em dia com `origin/main` — o
commit da feature já existia e já estava no GitHub antes desta chamada.

## Pipeline `bia-prd`

Todos os três estágios **Succeeded** para o commit `99b6927`:
- Source: Succeeded (GitHub, revisão `99b6927`)
- Build: Succeeded (`bia-build-prd`) — imagem
  `941490574517.dkr.ecr.us-east-1.amazonaws.com/bia:99b6927` publicada no ECR
- Deploy: Succeeded — `cluster-bia-alb` / `service-bia-alb`,
  `task-def-bia-alb:15`, rollout `FINISHED`

`service-bia-alb`: `desiredCount == runningCount == 2`, rollout `COMPLETED`,
ambos os targets `healthy`.

## Verificação em produção — primeira tentativa: FALHOU

Testado `https://formacaoaws.openxtec.com.br`: sem botão de editar na UI, e
`PUT /api/tarefas/update_titulo/<uuid>` retornava 404 genérico do Express —
a rota nova não existia no que estava sendo servido.

**Causa raiz identificada (infraestrutura, não código):** o listener HTTPS
(443) do `bia-alb` estava com a ação default apontando para `tg-bia-dev`
(ligado ao `service-bia-alb-dev`, imagem antiga `bia:e6a29b8`), em vez de
`tg-bia-alb` (ligado ao `service-bia-alb`, que a pipeline de fato atualiza).
Sobra de uma recriação do ALB. Não corrigido pelo agente — reportado, por
estar fora do escopo de uma publicação de rotina.

## Verificação em produção — após correção manual do listener: APROVADO

Confirmado depois, fora desta execução do agente: com o listener 443
corrigido para `tg-bia-alb`, `PUT /api/tarefas/update_titulo/<uuid>` passou
a responder corretamente (`{"message":"Tarefa não encontrada."}` para uuid
inexistente, e persistência real confirmada via UI).

## Veredito final

Feature publicada e, após a correção do listener (fora do escopo deste
agente), confirmada funcionando em produção.
