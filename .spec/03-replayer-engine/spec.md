# Especificação Técnica 03 — Motor de Reprodução Tática 2D e Interface do Replayer

## 1. Arquitetura do Motor 2D, Descompressão Local (`.bin.gz`) e Pipeline de Interpolação (60 FPS)

O reprodutor tático 2D do **CS2 Analyzer** opera de forma 100% Local-First. Ele resolve o caminho `replay_path` registrado no PostgreSQL local (`./data/replays/{mes-ano}/{dd-mm-aaaa}/{time1}_vs_{time2}_{formato}/{demo}.bin.gz`), descomprime o stream Gzip (nível 9) para restaurar o `ReplayDataPackage` em memória e desacopla a frequência de amostragem dos dados brutos da taxa de atualização visual do monitor ($60\text{ FPS}$ ou superior via `requestAnimationFrame`), garantindo fluidez contínua mesmo com snapshots espaçados.

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
2. **Orientação Angular pelo Caminho Mais Curto (`lerpAngleDegrees`):**
   $$\Delta\theta = ((\theta_{\text{end}} - \theta_{\text{start}} + 540) \bmod 360) - 180$$
   $$\theta(t) = (\theta_{\text{start}} + \Delta\theta \times t + 360) \bmod 360$$
3. **Estados Discretos:**
   Atributos não‑contínuos (`hp`, `armor`, `hasHelmet`, `isAlive`, `isDefusing`, `isPlanting`, `activeWeaponId`) preservam o estado do snapshot mais recente.

### 1.3 Ciclo de Renderização HTML5 Canvas (`RadarCanvas` & `canvas-renderer`)
- **Resolução Lógica Fixa:** $1024 \times 1024\text{ px}$ com transformação High‑DPI via `window.devicePixelRatio`.
- **Ordem de Camadas por Frame:**
  - **Camada 0 (Fundo):** Imagem de radar local pré‑carregada (`/maps/${mapName}_radar.png` ou `/maps/de_nuke_lower_radar.png`).
  - **Camada 1 (Utilitários e C4):** Smokes semitransparentes, granadas incendiárias/HE/Flash e marcador de estado da C4.
  - **Camada 2 (Base de Eliminados):** Jogadores mortos desenhados com opacidade reduzida (`0.35`) e marcador `'X'`.
  - **Camada 3 (Jogadores Vivos):** Círculo de raio `12px` (`#00d2d3` para CT, `#ff9f43` para T), linha de visão de `18px` projetada na direção `yaw` e número centralizado do atleta.

### 1.4 Suporte a Dois Andares Verticais na `de_nuke`
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
