# Especificação Técnica 03 — Motor de Reprodução Tática 2D e Interface do Replayer

## 1. Arquitetura do Motor 2D, Descompressão Local (`.bin.gz`) e Pipeline de Interpolação (60 FPS)

O reprodutor tático 2D do **CS2 Analyzer** opera de forma 100% Local-First. Ele consome os metadados da partida via `/api/matches/[id]` e o stream binário de telemetria via `/api/replays/[id]` (resolvido a partir de `./data/replays/[id]/` ou do caminho `replay_path` no PostgreSQL local: `./data/replays/{mes-ano}/{dd-mm-aaaa}/{time1}_vs_{time2}_{formato}/{demo}.bin.gz`), descomprime o stream Gzip (nível 9) progressivamente no navegador para restaurar o `ReplayDataPackage` em memória (com suporte à tupla canônica V2 de 22 posições e tuplas legadas de 14 posições) e desacopla a frequência de amostragem dos dados brutos da taxa de atualização visual do monitor ($60\text{ FPS}$ ou superior via `requestAnimationFrame`), garantindo fluidez contínua e supressão total de jitter visual mesmo com snapshots espaçados.

### 1.1 Taxa de Amostragem e Avanço Temporal (`useReplayPlayback`)
- **Tickrate Base ($T_{\text{rate}}$):** $64\text{ ticks/s}$ (padrão sub-tick CS2).
- **Fator de Subamostragem ($S_{\text{rate}}$):** A cada $4\text{ ticks}$ ($16\text{ snapshots/s}$).
- **Avanço por Frame (`requestAnimationFrame`):**
  $$\Delta \text{ticks} = \Delta t \times T_{\text{rate}} \times \text{playbackSpeed}$$

### 1.2 Pipeline de Interpolação Matemática (`src/utils/interpolation.ts`)
Para qualquer tick fracionário `currentTick` situado entre dois snapshots amostrados $F_{\text{prev}} (t_0)$ e $F_{\text{next}} (t_1)$ extraídos do pacote `.bin.gz`, calcula-se o fator normalizado $t \in [0, 1]$:
$$t = \text{clamp}\left(\frac{\text{currentTick} - t_0}{t_1 - t_0}, 0, 1\right)$$

1. **Posição Linear 3D (`lerp`):**
   $$\text{world}_{X,Y,Z}(t) = \text{start} + (\text{end} - \text{start}) \times t$$
2. **Orientação Angular pelo Menor Caminho (`lerpAngleDegrees` / `slerpYaw`):**
   $$\Delta\theta = ((\theta_{\text{end}} - \theta_{\text{start}} + 540) \bmod 360) - 180$$
   $$\theta(t) = (\theta_{\text{start}} + \Delta\theta \times t + 360) \bmod 360$$
3. **Interpolação de Pitch (`lerpPitch`):** Clamping estrito entre $[-89^\circ, 89^\circ]$.
4. **Decaimento Linear de Cegueira (`flashDuration`):** Redução proporcional contínua entre ticks decorridos.
5. **Estados Discretos:**
   Atributos não‑contínuos (`hp`, `armor`, `hasHelmet`, `isScoped`, `isCrouching`, `isAirborne`, `isDefusing`, `activeWeapon`) preservam o estado do snapshot mais recente ($t \ge 0.5 \text{ ? next : prev}$).

### 1.3 Algoritmo do Pintor em 7 Camadas Estritas (`ViewportCanvas`)
O viewport renderiza todas as entidades através de uma ordem canônica e imutável de camadas:
- **Camada 0 (Fundo):** Radar PNG estático oficial CS2 (centralizado e escalado $1024 \times 1024$).
- **Camada 1 (Utilitários Ativos & Trajetórias):**
  - Smokes ativas: círculos preenchidos cinza translúcido (`rgba(148, 163, 184, 0.45)`) com borda suave durante `startTick <= currentTick <= endTick`.
  - Molotovs/Fogo: círculos alaranjados translúcidos pulsantes (`rgba(239, 68, 68, 0.35)`).
  - Trajetórias balísticas de utilitários arremessados recentemente.
- **Camada 2 (C4 e Entidades de Solo):** C4 plantada (pulso circular vermelho com contagem regressiva), C4 solta no chão (ícone amarelo/vermelho com glow).
- **Camada 3 (Traçantes de Tiro):** Linhas efêmeras de vetor de disparo saindo da posição do atirador na direção do `yaw` para tiros efetuados no tick atual.
- **Camada 4 (Jogadores Mortos):** Marcador 'X' cinza/translúcido da equipe com anel atenuado na posição do óbito.
- **Camada 5 (Jogadores Vivos):**
  - Cones de visão com comprimento de 24px e abertura de 30° na direção do `yaw`. Se `isScoped === true`, desenha linha guia pontilhada estendida.
  - Indicador de cego: ícone ou anel brilhante caso `flashDuration > 0`.
  - Círculo de atleta com cor oficial (#2563EB para CT, #EA580C para TR).
  - Anel perimétrico de HP dinâmico (Verde > 50, Amarelo > 20, Vermelho <= 20).
  - Anel/barra de desarme ativo (`isDefusing`) com destaque visual e cabo de conexão com a C4.
  - Tipografia legível com número do atleta, nickname e arma ativa.
- **Camada 6 (Indicadores de Dano / Floating Combat Text):** Texto flutuante `-XX` com animação ascendente efêmera indicando dano recente recebido.

### 1.4 HUD Tático e Gestão de Economia (`ReplayHUD`)
- **Cards de Atletas:** Exibem status em tempo real com badges `SCOPED`, `BLIND (Xs)`, `KIT` e barra de progresso do desarme kit-aware (5.0s com kit, 10.0s sem kit).
- **Badges de Round:** Exibem classificação econômica tática (`FULL BUY`, `SEMI-BUY`, `SEMI-ECO`, `ECO`) calculada com base no investimento de equipamento.
- **Placar Cumulativo Dinâmico:** Atualização instantânea a cada round (`ctScore` x `tScore`).

### 1.5 Suporte a Dois Andares Verticais na `de_nuke`
- **Corte de Altitude ($Z = -495$):** Em `de_nuke`, coordenadas com $Z < -495$ pertencem ao piso inferior (`lower`); coordenadas com $Z \ge -495$ pertencem ao piso superior (`upper`).
- **Projeção Multicamada:** Quando o operador alterna entre pavimentos, jogadores no andar oposto são renderizados com opacidade atenuada (`0.25`), anel tracejado e indicador visual (`▲` para andar superior, `▼` para andar inferior).
- **Pool Competitivo Oficial:** A rotação canônica integra `de_cache` em substituição à `de_vertigo`.

---

## 2. Protocolo de Inversão de Lados no CS2 MR12 (`TeamRosterPanel`)

No formato oficial MR12, ocorre a troca obrigatória de lados a partir do **Round 13**:

| Faixa de Rounds | Bloco Superior (`roster-block-top`) | Bloco Inferior (`roster-block-bottom`) | Mapeamento de Jogadores |
| :--- | :--- | :--- | :--- |
| **Rounds 1 a 12** (1ª Metade) | **Equipe CT** (`#00d2d3` Ciano) | **Equipe T** (`#ff9f43` Laranja) | Mantém `initialTeam` do manifesto |
| **Round 13+** (2ª Metade / OT) | **Equipe T** (`#ff9f43` Laranja) | **Equipe CT** (`#00d2d3` Ciano) | Inverte a ordem vertical dos blocos e troca o lado ativo de cada atleta (`CT <-> T`) |

---

## 3. Sincronização do Kill Feed e Timeline (`KillFeed` & `TimelineControls`)
1. **Kill Feed Reativo ao Tick:** Exibe exclusivamente abates com `tick <= currentTick`. Ao realizar scrubbing reverso, mortes futuras desaparecem imediatamente.
2. **TimelineControls:** Botões de seleção de rounds destacados com a cor do vencedor (`round.winnerSide`). Slider projeta marcas visuais nos ticks de abates e plant da C4.
