# Workflow de git entre múltiplos ambientes

Ambientes usados neste projeto: Windows (esta estação), EC2 `bia-dev`. O
GitHub (`lucalipe/bia`) é o ponto central — cada ambiente é uma cópia
independente que precisa se manter alinhada com ele.

## Regra de ouro: Pull → Trabalhar → Commit → Push

Em **qualquer** ambiente, sempre nessa ordem:

1. **Antes de começar a mexer em algo:** `git pull` — garante partir do que
   há de mais recente no GitHub, evita trabalhar em cima de código
   desatualizado.
2. **Ao terminar uma mudança:** `git add` + `git commit`.
3. **Assim que possível:** `git push` — manda pro GitHub imediatamente, não
   deixa acumular.

## Checklist prático

- Ao abrir uma sessão de trabalho em qualquer uma das máquinas: `git status`
  (ver se há algo pendente) + `git pull` (trazer o que faltar).
- Ao terminar uma mudança que funcionou: commit + push na hora, não
  "deixa pra depois".
- Ao alternar entre Windows e `bia-dev` no mesmo dia: sempre `git pull` ao
  trocar de máquina, antes de continuar.

## Por que isso importa (histórico real)

Dois problemas já aconteceram neste projeto pela mesma causa — mudanças
feitas na `bia-dev` ficaram dias sem commit/push enquanto outras mudanças
eram commitadas direto do Windows, e os históricos divergiram:

1. O remoto da `bia-dev` apontava pro `henrylle/bia` (repo original do
   curso) em vez do fork `lucalipe/bia`, causando push rejeitado.
2. A correção da barra dupla no `Dockerfile` (bug do `VITE_API_URL`) existiu
   só localmente na `bia-dev` por um tempo, foi sobrescrita sem querer por
   uma mudança local posterior, e a pipeline acabou implantando a versão com
   o bug de novo.

Tratar as duas máquinas como "dois colaboradores no mesmo repositório" —
com a mesma disciplina de sincronização que se usaria em um time — evita
repetir esse tipo de problema.
