# Roteiro: Atividade de entrega da Formação AWS

Objetivo da atividade (entrega do curso):
1. Colocar a app em alta disponibilidade
2. Configurar domínio com HTTPS
3. Configurar Pipeline CI/CD
4. Colocar CDN e proteger o Load Balancer

Abordagem: o aluno (eu) vai implementar sozinho acompanhando as aulas. O
Claude Code é consultado ponto a ponto quando surgir dúvida ou erro, e serve
pra validar cada fase antes de avançar pra próxima — não para implementar no
lugar do aluno.

## Estado da conta no momento em que este roteiro foi escrito (2026-09-16)

- **EC2:** `bia-dev` (running, t3.micro) rodando a app diretamente via `npm start`
  na porta 3001 — ponto único de falha, ainda não containerizada em ECS.
  `bia-dev-ssh` e `bia-dev2` paradas (possível limpeza futura).
- **RDS:** `bia` (PostgreSQL, db.t3.micro, não público, sem Multi-AZ) — ok pro
  estágio atual do curso.
- **ECR:** repositório `bia` já existe, com pelo menos uma imagem publicada.
- **ECS:** nenhum cluster criado ainda.
- **Load Balancer:** nenhum.
- **CodeBuild / CodePipeline:** nenhum (confirmado — não existe nada, será
  criado do zero).
- **ACM / Route53 / CloudFront / WAF:** não verificados via CLI (o usuário IAM
  `iam-user1` não tem permissão de leitura nesses serviços) — presume-se que
  não existe nada, a criar do zero.
- **Domínio:** `openxtec.com.br`, registrado no registro.br, **sem uso atual**
  (livre para migrar a gestão de DNS inteira para o Route53 sem risco de
  quebrar email/site existente).
- **VPC:** apenas a VPC default (`172.31.0.0/16`).

## Convenções já definidas para este projeto

As convenções de nome de recursos (cluster, task definition, service, security
groups) já estão documentadas em `.kiro/rules/infraestrutura.md`, cenário
"Com ALB" — usar essas convenções ao criar os recursos das fases abaixo.

## Fase 1 — Alta disponibilidade ✅ CONCLUÍDA (2026-09-16)

- Cluster ECS `cluster-bia-alb`, tipo EC2, 2 instâncias t3.micro — uma em
  `us-east-1a`, outra em `us-east-1b`
- Task Definition `task-def-bia-alb` (revisão 4: CPU 1024, Memory 400,
  container `bia` na porta 8080, host port dinâmico)
- Application Load Balancer `bia-alb`, internet-facing, subnets das duas zonas
- Target Group `tg-bia-alb`, tipo instance, health check em `/`
- ECS Service `service-bia-alb`: desired=2, running=2, rolling update
  (min healthy 50%, max 100%), Availability Zone rebalancing desativado
- Security Groups ajustados: `bia-alb` (80/443 públicos), `bia-ec2` (all TCP
  só a partir do `bia-alb`), `bia-db` atualizado para aceitar o `bia-ec2`

**Pendência cosmética (não bloqueia):** a descrição da regra do SG `bia-alb`
ficou "acesso publico HTTP-HTTPS" em vez do padrão exato da rule
("acesso público HTTP/HTTPS") — decidido deixar como está, sem impacto
funcional.

**Notas de implementação para lembrar depois:**
- ECS não permite renomear Target Group nem Service depois de criados — para
  corrigir nome é preciso escalar o service a 0, deletar, e recriar.
- No console, o campo "Service name" ao criar um service vem pré-preenchido
  com o nome da task definition — apagar e digitar o nome correto manualmente,
  senão o service fica com nome errado (aconteceu duas vezes nessa fase).
- Se o toggle "Availability Zone rebalancing" estiver ligado, o console exige
  Maximum percent > 100 — desativar o toggle antes de definir 50/100.

**Bug pós-deploy encontrado e corrigido: app não persistia dados.** Causas
(duas, encontradas em sequência):
1. `DB_PWD` na Task Definition estava com a senha antiga/errada — corrigido
   pra bater com o secret `rds/bia/credentials` no Secrets Manager.
2. Bug real: no `Dockerfile` da `bia-dev`, o build do frontend fixava
   `VITE_API_URL=http://bia-alb-.../` **com barra no final** — isso gerava
   `${apiUrl}/api/tarefas` como URL com barra dupla (`...///api/tarefas`),
   que o Express não roteava para POST (dava 404), embora GET "funcionasse"
   por acidente. Corrigido removendo a barra final do `VITE_API_URL` no
   Dockerfile e rebuildando com `deploy-com-ia.sh`.

**Ponto frágil pra observar depois:** o DNS do ALB está hardcoded no
Dockerfile como `VITE_API_URL`. Se o ALB for recriado, o DNS muda e isso
quebra de novo — considerar usar caminho relativo no frontend em vez de URL
absoluta, já que API e front ficam atrás do mesmo ALB.

**Importante sobre onde o código realmente está:** o remoto git da `bia-dev`
aponta para `https://github.com/henrylle/bia` (o repositório original do
curso), não para `lucalipe/bia`. O código que gera as imagens Docker é o que
está fisicamente naquela pasta na EC2, que pode divergir do que está no
GitHub (aconteceu: o ajuste do `VITE_API_URL` para o ALB foi feito só
localmente na `bia-dev`, nunca commitado/pushado). Vale considerar trocar o
remoto da `bia-dev` para `lucalipe/bia` e commitar esses ajustes lá.

Sem essa fase, as próximas não resolveriam o problema real de disponibilidade
— era a base de tudo.

## Fase 2 — Pipeline CI/CD ✅ CONCLUÍDA (2026-09-18)

- **CodeBuild**: projeto `bia-build-prd`, usa o `buildspec.yml` do repo
  (build da imagem, push pro ECR, gera `imagedefinitions.json`). Role com
  `AmazonEC2ContainerRegistryPowerUser` + policy base de logs.
- **CodePipeline**: `bia-prd`, 3 estágios:
  - Source: GitHub (`lucalipe/bia`, branch `main`) via CodeConnections,
    trigger automático em push
  - Build: CodeBuild `bia-build-prd`
  - Deploy: ação ECS nativa do CodePipeline, `cluster-bia-alb` / `service-bia-alb`
- Testado de ponta a ponta ao vivo: push → build → deploy automático → app
  atualizada em produção, sem rodar nada manual.

**Bug encontrado durante a validação: regressão da barra dupla.** O commit
`c9412b3 "Alteracoes para CICD"` (feito direto na `bia-dev`) reintroduziu o
bug do `VITE_API_URL` com barra final no `Dockerfile` (o mesmo problema da
Fase 1). Causa: a correção anterior só existia localmente na `bia-dev` e
nunca tinha sido commitada — foi sobrescrita sem querer. Corrigido de novo e
dessa vez commitado e enviado, com a pipeline fazendo o deploy automático da
correção (validação real do CI/CD).

**Achado de segurança, não commitado (decisão consciente):** o `compose.yml`
modificado localmente na `bia-dev` apontava `DB_HOST`/`DB_PWD` pro RDS de
produção, com a senha em texto plano (e ainda por cima a senha antiga/errada).
Decidido não commitar — `compose.yml` é pro ambiente local isolado, e expor
credencial de produção no histórico do git é um risco real. Ficou só como
mudança local não commitada.

**Lição de processo:** o remoto da `bia-dev` (`henrylle/bia` originalmente)
foi corrigido pra `lucalipe/bia` durante essa fase, resolvendo a divergência
de histórico mencionada na Fase 1. Ainda assim, vale o hábito de sempre
`git status` + revisar `git diff` antes de commitar mudanças feitas direto
na EC2, já que apareceram junto outras alterações não relacionadas
(`.kiro/agents/bia.json` com uma região AWS errada, `compose.yml` arriscado,
scripts novos ainda não revisados).

## Fase 3 — Domínio com HTTPS

1. Criar hosted zone no Route53 para `openxtec.com.br`
2. Copiar os 4 NS records gerados e trocar os DNS servers no painel do
   registro.br para apontar pra eles (migra a resolução de DNS pro Route53;
   o registro em si continua no registro.br)
3. Aguardar propagação
4. Solicitar certificado ACM para `openxtec.com.br` (considerar também
   `*.openxtec.com.br` se for usar subdomínio, ex: `bia.openxtec.com.br`) —
   validação via DNS
5. Anexar o certificado ao listener HTTPS (443) do ALB da Fase 1
6. Criar registro no Route53 apontando o domínio/subdomínio pro ALB

## Fase 4 — CDN e proteção do Load Balancer

- Criar distribuição CloudFront com o ALB como origem
- Usar o mesmo certificado ACM (precisa estar em `us-east-1` para uso no
  CloudFront — já é a região usada, sem problema)
- **Proteger o ALB de verdade:** hoje, se alguém souber o endereço do ALB,
  consegue bypassar o CloudFront. Travar o Security Group do ALB para aceitar
  tráfego apenas da prefix list gerenciada da AWS para CloudFront, em vez de
  `0.0.0.0/0`
- Opcional (reforço extra): AWS WAF na distribuição CloudFront com regras
  gerenciadas básicas

## Como vamos trabalhar isso

- Eu implemento fase por fase acompanhando as aulas do curso.
- Ao travar em algo (erro, dúvida sobre um passo), trago o contexto pro
  Claude Code e resolvemos junto.
- Ao final de cada fase, valido o resultado com o Claude antes de avançar
  pra próxima (ex: confirmar que o ALB está distribuindo entre as duas
  instâncias antes de partir pra Fase 2).
