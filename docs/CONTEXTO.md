# Contexto do projeto — Todo Tracker

Documento para retomar o trabalho em outra máquina ou numa nova sessão do Claude sem o histórico da conversa.
Leia junto com `AGENTS.md` (regras do template Expo). Atualizado em 2026-11-20.

## 1. Produto

App Android pessoal de **hábitos + tarefas**, "hábitos como commits", com a identidade visual do GitHub.

- **Hábitos** de 3 tipos de meta:
  - `binary` (sim/não; no máximo 1 commit por dia);
  - `count` (meta diária, ex.: 8 copos);
  - `time` (minutos por dia, ex.: 30 min de leitura).
- **Cada registro é um commit.** Gráfico de contribuições por hábito (53 semanas) com intensidade 0–4:
  - nível 1: 1–24% da meta;
  - nível 2: 25–49%;
  - nível 3: 50–99%;
  - nível 4: ≥100%;
  - `binary` só tem 0 ou 4.
- **Gráfico geral (aba Geral):** cada item concluído no dia conta 1 (hábito que bateu a meta ou tarefa concluída). O nível é relativo ao melhor dia do período (≤25% → 1, ≤50% → 2, ≤75% → 3, senão 4).
- **Métricas:** eficiência mensal, sequências atual e recorde, totais e ranking.
- **Tarefas avulsas:** prazo opcional, com data e horário. Criar no passado é bloqueado no formulário, no calendário e no repositório.
- **Decisões do usuário:**
  - só Android;
  - a meta é **versionada**: mudar meta ou dias vale a partir de hoje, e o passado é julgado pela versão da época;
  - a semana começa sempre no **domingo** e o dia é o do relógio do celular (vira à meia-noite). Não são configuráveis (decisão de 2026-11-26);
  - só um cronômetro rodando por vez.
- **Fora do escopo v1:** sincronização na nuvem, iOS, widgets.

### Paleta (GitHub Primer)

| Token | Escuro | Claro |
|---|---|---|
| canvas | #0d1117 | #ffffff |
| surface | #161b22 | #f6f8fa |
| surfaceMuted | #21262d | #eaeef2 |
| border | #30363d | #d0d7de |
| text | #e6edf3 | #1f2328 |
| textMuted | #7d8590 | #656d76 |
| accent | #2f81f7 | #0969da |
| success | #3fb950 | #1a7f37 |
| danger | #f85149 | #d1242f |
| done | #8957e5 | #8250df |
| attention | #d29922 | #9a6700 |
| buttonPrimaryBg | #238636 | #1f883d |
| levels 0–4 | #161b22 #0e4429 #006d32 #26a641 #39d353 | #ebedf0 #9be9a8 #40c463 #30a14e #216e39 |

**Logo:** quadrado arredondado só com contorno, com 3 círculos verdes crescentes.
- A geometria vive em `src/ui/brand/logo.json`.
- `npm run icons` (`scripts/generate-icons.mjs`) gera os SVGs em `assets/brand/` e os PNGs em `assets/images/`, incluindo `notification-icon.png` (branco sobre transparente, 96px).

## 2. Stack e convenções

- **Base:** Expo SDK 58 (`expo ~58.0.26`), React Native 0.88.1, React 19.3.0, TypeScript 6.
  - TS em modo strict, com `noUncheckedIndexedAccess`.
  - Alias `@/*` → `src/*`.
- **Navegação:** Expo Router.
  - Rotas em `src/app/`.
  - Abas vêm de `expo-router/js-tabs`.
  - `typedRoutes` ligado: os tipos são regenerados pelo `expo start` em `.expo/types`.
- **Dados:** `expo-sqlite` atrás de um `SqlDriver` próprio (`src/data/driver.ts`).
  - Uma conexão só, fila serializada, com `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK` manuais.
  - Não usamos `withExclusiveTransactionAsync`: ele abre outra conexão, sem `foreign_keys`.
  - **Dentro de `db.transaction(async (tx) => …)` use sempre `tx`.** Chamar `db` ali dentro trava, porque a fila espera a transação terminar.
  - Migrações por `PRAGMA user_version` (`src/data/migrations.ts`), com WAL e foreign_keys ligados.
- **Estado de servidor:** `@tanstack/react-query` com `staleTime: Infinity` e `retry: false`.
  - Toda mutação chama `invalidateUserData` (invalida tudo, exceto `settings`).
- **Domínio puro em `src/domain/`:**
  - datas lógicas no formato `LocalDate` (`YYYY-MM-DD`), com aritmética em UTC para não sofrer com horário de verão;
  - versões de meta em `habit_schedule` (`effective_from`, `daily_target` e `active_days`, um bitmask com bit0 = domingo).
- **Regras de cálculo:**
  - eficiência: hoje só conta se a meta foi batida; dias inativos não contam;
  - sequência: hoje pendente não quebra, e dias inativos são pulados.
- **UI:**
  - Componentes temáticos próprios em `src/ui/components/`.
  - Não usamos `Alert.alert` nem o datetimepicker nativo: em vez deles, `Sheet`, `DialogProvider` (`confirm`/`alert`/`showError`), `DatePickerSheet` e `TimePickerSheet`.
  - Ícones são os Octicons de `@expo/vector-icons`.
- **Testes:**
  - Jest com dois projetos:
    - `app` usa o preset jest-expo e cobre `src/**/__tests__`, exceto `src/data`;
    - `data` roda no ambiente node e usa `node:sqlite` (DatabaseSync) via `src/data/__tests__/support.ts`, que tem `FakeClock` e `at()`.
  - Testing Library RN v14: `render` e `fireEvent` são assíncronos (use `await`). Texto dentro de SVG fica na prop `content` de um `TSpan`.
- **Lint:**
  - `react-hooks/set-state-in-effect`: para evitar, monte o corpo do componente só enquanto ele está visível.
  - `import/namespace` dá falso positivo em `Notifications.AndroidImportance`; já está suprimido na linha.
- **Windows:**
  - Scripts Python que escrevem arquivo precisam de `newline=''`, ou gravam CRLF e o prettier/lint reclama. Para corrigir, `npx prettier --write <arquivos>`.
  - Os avisos de CRLF do git são esperados.

### Comandos

```bash
npm install
npm start                 # expo start (abre no APK de desenvolvimento instalado no celular)
npx expo start --clear    # se o Metro não achar um pacote recém-instalado
npm test                  # jest (os 2 projetos)
npm run typecheck         # tsc --noEmit
npm run lint              # expo lint
npx expo-doctor
npx expo install <pkg>    # sempre use isto, não npm add
```

Antes de dar uma tarefa como pronta, rode typecheck, lint e testes. Na última verificação: 31 suítes, 279 testes passando.

## 3. Histórico

| Commit | Fase |
|---|---|
| 3e7df28 | 0+1: base do app, tema, logo e domínio de cálculo |
| 027228e | 2: camada SQLite e repositórios |
| a93fec7 | 3: MVP (Hoje, novo hábito, contribution graph) |
| a2c8491 | 3b: tarefas avulsas e ajustes de UX |
| cc180d9 | 4: histórico, editar dia, arquivar/excluir, diálogos temáticos |
| 9503525 | 5: métricas e visão geral |
| 2779cab | 6: cronômetro para hábitos de tempo |
| 17306c9 | 7: notificações + EAS (validado no aparelho em 2026-11-25) |
| (seguinte) | 8: exportar backup e tema persistido (validado no aparelho em 2026-11-26), ver §4b |

## 4. Fase 7: notificações (concluída)

### Implementado
Arquivos em `src/features/notifications/`:

- **`model.ts`** (puro, testado em `src/features/__tests__/notifications.test.ts`):
  - `planNotifications`:
    - janela de 14 dias, só em dias ativos;
    - pula horário já passado e o dia de hoje se a meta foi batida;
    - ignora hábitos arquivados;
    - dia pelo relógio do celular (meia-noite);
    - tarefas entram no prazo com horário;
    - teto de 400 agendamentos.
  - `reconcile`: diff por id determinístico (`habit:<id>:<data>:<minuto>`, `task:<id>:<data>:<minuto>`) e por `data.sig`.
  - `instantOf`, `parseData` e `scheduledAt`.
- **`service.ts`:**
  - `setupNotifications` cria o canal `lembretes` e as categorias `habit_commit` (botão **Commitar**) e `task_complete` (botão **Concluir**), ambas com `opensAppToForeground: true`.
  - `syncNotifications` serializa as chamadas.
  - Também: `ensurePermission`, `getPermission`, `listScheduled` e `scheduleTestNotification` (id `test:…`, que a reconciliação não toca).
- **`actions.ts`:** `runResponse` (testado em `src/data/__tests__/notificationActions.test.ts`).
  - Commitar registra +1 com `source: 'notification'`, só se o lembrete for do dia lógico atual.
  - Concluir fecha a tarefa.
- **`NotificationsBridge.tsx`** (montado no `_layout`) reconcilia em três momentos:
  - ao abrir o app;
  - ao voltar ao primeiro plano;
  - 300 ms depois de qualquer mutação bem-sucedida (assina o `MutationCache`).
  - Também trata as respostas às notificações, incluindo `getLastNotificationResponse` no cold start.
- **`NotificationSettings.tsx`** (card em Ajustes) mostra:
  - o status da permissão;
  - a contagem e os 5 próximos agendados;
  - o botão **Testar notificação (1 min)**.
- **Formulário do hábito:** seção Lembretes (até 5 horários) usando `reminderRepo.setForHabit`. A permissão é pedida ao adicionar o primeiro horário.

### Validação no aparelho (2026-11-25)
- Lembretes disparam com o app fechado.
- **Commitar** pela notificação registra o commit e **Concluir** fecha a tarefa.
- Ao bater a meta, o lembrete do dia deixa de tocar.
- Sem alarme exato (`SCHEDULE_EXACT_ALARM`): o Android pode atrasar alguns minutos. Se o atraso incomodar, avaliar `delivery: 'alarmClock'`.
- **Decisão já tomada:** os botões da notificação abrem o app, porque é o caminho confiável. Rodar a ação sem abrir o app exigiria `expo-task-manager`, que não instalamos.

### EAS / build
- Conta Expo `erikvix`, projeto `@erikvix/todo-tracker` (`extra.eas.projectId` no `app.json`).
- A keystore Android foi gerada e está guardada na Expo.
- `eas.json` tem três perfis:
  - `development`: dev client, APK de distribuição interna;
  - `preview`: APK standalone;
  - `production`.
- O aviso de que `cli.appVersionSource` vai ser obrigatório ainda não foi resolvido.
- O APK de desenvolvimento já está instalado no celular. Só é preciso refazê-lo ao adicionar uma biblioteca **nativa**; mudança de JS só precisa de `npm start`.
  - Build: `npx eas-cli@latest build --profile development --platform android` (exige `npx eas-cli@latest login`).
- **Combinado:** APK de release só quando estiver estável.
- **Release pelo GitHub, ainda não feito.** Opções levantadas:
  - (A) workflow que chama `eas build --profile preview` e anexa o APK a uma GitHub Release, disparado por tag `v*`, com o secret `EXPO_TOKEN` (recomendada);
  - (B) build com Gradle no runner, com a keystore como secret.
  - Também pendente: separar o pacote do APK de desenvolvimento (ex.: `dev.local.todotracker.dev`), para não sobrescrever o app de release.

## 4b. Fase 8: backup e ajustes

- **Importação foi descartada:** o usuário começa do zero, então só existe exportação.
- **Exportar backup** (`src/data/repositories/backupRepo.ts`, `src/features/backup/`):
  - `backup.exportAll()` lê numa transação as linhas cruas de `habit`, `habit_schedule`, `commit_entry`, `task`, `reminder` e `setting`. O cronômetro ativo fica fora.
  - Formato: `{ app: 'todo-tracker', format: 1, schemaVersion, exportedAt, tables }`.
  - `shareBackup` grava `todo-tracker-backup-AAAA-MM-DD.json` em `Paths.cache` (`expo-file-system`, API `File`) e abre o compartilhamento (`expo-sharing`).
  - O plugin `expo-sharing` **não** está no `app.json`: ele serve só para receber compartilhamentos, e aqui só enviamos.
- **Ajustes persistidos** (`src/features/settings/PreferenceCards.tsx`, mutação `useUpdateSetting`):
  - tema: aplicado na hora e gravado; se a gravação falhar, volta ao anterior. Ao abrir, o `DatabaseProvider` lê o tema salvo e segura a splash (`preventAutoHideAsync`/`hideAsync`) até aplicar;
  - início da semana e virada do dia **foram removidos** a pedido do usuário: semana fixa no domingo, dia pelo relógio (meia-noite). `Settings` tem só `theme`; chaves antigas no banco são ignoradas pelo `getAll`. As funções puras (`src/domain/`, `notifications/model.ts`, `timer/model.ts`, `ContributionGraph`, `DatePickerSheet`) mantêm os parâmetros `weekStart`/`rolloverHour` com padrão 0, mas o app não os usa.
- **Bibliotecas nativas novas** (`expo-file-system`, `expo-sharing`): exigem **novo build de desenvolvimento** antes de testar no aparelho.

## 5. Pendências

1. Release pelo GitHub (§4): o usuário ainda decide entre A e B e se separa o pacote do APK de desenvolvimento.

## 6. Regras de trabalho com o usuário

(Resumo das instruções globais dele, que ficam em `~/.claude/CLAUDE.md` em cada máquina.)

- Comunicação direta, sem elogio. Quando ele estiver errado, dizer objetivamente.
- **Para toda ordem, apresentar um plano e esperar autorização expressa** antes de usar ferramentas ou alterar qualquer coisa. Se o plano mudar materialmente durante a execução, parar e pedir de novo.
- Trabalho por fases: plano → aprovação → código completo + testes + instruções → validação dele no aparelho.
- **Commit só quando ele pedir. Push para o GitHub só com autorização explícita.** Nunca criar, apagar ou forçar push de branches sem autorização.
- Idioma: português. Textos do app em pt-BR.

## 7. Setup numa máquina nova

1. Instale o Node 22+ e o Git, e clone o repositório.
2. Rode `npm install`.
3. Copie as instruções globais para `~/.claude/CLAUDE.md`, se quiser as mesmas regras.
4. Rode `npx eas-cli@latest login`; só é necessário para builds.
5. Rode `npm start`, com celular e PC na mesma rede, e abra o app **Todo Tracker** de desenvolvimento no celular.
6. Numa nova sessão do Claude, peça para ler `docs/CONTEXTO.md` e `AGENTS.md`.

Segredos (token do Expo e qualquer outra credencial) **não ficam no repositório**.
