# Especificação Técnica 01 — Contratos de Dados e Coordenadas de Radar (CS2 Analyzer)

## 1. Decisão Arquitetural: Persistência 100% Local-First (PostgreSQL 16 + File System `.bin.gz`)

Toda a infraestrutura opera em regime **Zero Nuvem** (sem Supabase, S3 ou APIs remotas de armazenamento). Para garantir consultas sub-milissegundo em listagens, dashboards e filtros sem degradar o buffer cache do PostgreSQL local com matrizes de telemetria multi-megabyte, a persistência local é dividida em duas camadas estritas:

1. **PostgreSQL 16 Local (`cs2-postgres` / `cs2_analytics`) — Metadados Relacionais e KPIs**
   - Executado via container Docker (`postgres:16-alpine` na porta `5432`, conectado via `DATABASE_URL`).
   - Armazena de forma normalizada nas tabelas `matches`, `match_maps` e `player_stats` os metadados da partida (`match_date`, `team1`, `team2`, `format`, `score_t1`, `score_t2`, `winner`, `demo_hash`), estatísticas por mapa (`map_name`, `rounds_t1`, `rounds_t2`, `duration`) e indicadores de desempenho por atleta (`rating`, `adr`, `kast`, `kills`, `deaths`, `assists`, `ttd`, `ttk`, `fsp`, `metrics_json`).
   - Mantém a referência física `replay_path` na tabela `matches` apontando para o arquivo binário comprimido no sistema de arquivos local, além de sincronizar o snapshot de leitura rápida em `src/data/ingested-matches.json`.

2. **Sistema de Arquivos Local (`./data/replays/...`) — Telemetria Posicional e Artefatos Canônicos**
   - Armazena o pacote estruturado `ReplayDataPackage` (manifestos de jogadores/armas, rounds, eventos discretos de `damages`, `kills`, `utility`, `bomb`, `duels` e frames amostrados `RawFrame[]`).
   - O payload JSON é comprimido em binário via **Gzip nível máximo (`level: 9`)** e gravado simultaneamente sob duas estratégias de organização em disco:
     - **Taxonomia Analítica Cronológica:**
       `./data/replays/{mes-ano}/{dd-mm-aaaa}/{time1}_vs_{time2}_{formato}/{nome_original_da_demo}.bin.gz`
     - **Diretório Canônico de Acesso Direto do Frontend:**
       `./data/replays/[id]/` (onde `[id]` corresponde ao UUID da partida ou `demo_hash`):
       - `[id].bin.gz`: Arquivo de telemetria principal comprimido em Gzip nível 9.
       - `replay.bin.gz`: Alias padronizado para streaming binário direto.
       - `${originalBaseName}.bin.gz`: Cópia preservando o nome original do arquivo `.dem`.
       - `match.json`: Metadados completos da partida serializados em JSON como fallback resiliente caso o PostgreSQL esteja inativo ou offline.
       - `${originalBaseName}.json`: Espelho de metadados com nome original.

### 1.1 Protocolo de Resolução de Replays e Consumo por APIs Locais

A entrega dos artefatos para a interface e para o Replayer 2D segue uma cascata determinística de resolução com fallbacks defensivos:

1. **Resolução de Metadados (`GET /api/matches/[id]`):**
   - **Camada 1 (PostgreSQL):** Executa `getMatchById(id)` consultando as tabelas relacionais `matches`, `match_maps` e `player_stats`.
   - **Fallback 1 (Disco Local Canônico):** Se a consulta ao banco não retornar dados ou o banco estiver inacessível, inspeciona `./data/replays/[id]/match.json`, servindo `parsed.match || parsed.matchRecord`.
   - **Fallback 2 (Snapshot Estático):** Inspeciona `src/data/ingested-matches.json` buscando por `matchId` ou `demoHash`.

2. **Resolução de Telemetria (`GET /api/replays/[id]`):**
   - **Camada 1 (PostgreSQL):** Consulta o campo `replay_path` em `public.matches` pelo `id` (UUID) ou `demo_hash`.
   - **Fallback 1 (Diretório Canônico):** Inspeciona `./data/replays/[id]/` buscando qualquer arquivo `.bin.gz` ou `.json`.
   - **Fallback 2 (Caminho Canônico Default):** Resolve a partida canônica de fallback (`54e43847-2490-4751-9981-831bf7cf367c`) em `./data/replays/10-2026/18-10-2026/FURIA_vs_Aurora_BO1/furia-vs-aurora-m2-inferno.bin.gz`.
   - **Entrega por Streaming:** Por padrão, despacha um `ReadableStream<Uint8Array>` com cabeçalhos `Content-Type: application/octet-stream` e `Cache-Control: no-cache`. Se o cliente passar explicitamente `?format=json`, descomprime em memória no servidor (`zlib.gunzipSync`) e devolve JSON com `Cache-Control: public, max-age=3600`.

3. **Consumo no Replayer 2D (`ReplayEngine` + `src/lib/replay/decompress.ts`):**
   - O componente `ReplayEngine` dispara em paralelo as requisições para `/api/matches/[id]` (metadados do HUD) e `fetchAndDecompressReplay(matchId)` para `/api/replays/[id]`.
   - A descompressão no cliente utiliza streaming com `DecompressionStream('gzip')` (Web API nativa) ou fallback progressivo via `pako` em chunks de 64KB, intercalando concessões cooperativas à thread do navegador a cada 256KB (`setTimeout(r, 0)`) para prevenir congelamento de UI (*jank*).
   - O payload é normalizado via `normalizeReplayPayload` e as tuplas de jogadores são hidratadas em `PlayerState[]` para renderização contínua a 60 FPS no Canvas 2D.

---

## 2. Contratos de Telemetria Analítica (`src/types/stats.ts`)

As visões de performance recente e gráficos táticos consomem a estrutura padronizada `RecentMatchTelemetry`, que garante o desdobramento de cada indicador por contexto tático (`overall`, `ct` e `t`):

```ts
export interface RecentMatchMetricsBreakdown {
  overall: number;
  ct: number;
  t: number;
}

export interface RecentMatchTelemetry {
  matchId: string;
  mapName: string;
  opponentTeam: string;
  opponentSlug?: string;
  opponentLogoUrl: string;
  date: string;
  teamScore?: number;
  opponentScore?: number;
  score?: string;
  result?: 'W' | 'L';
  metrics: {
    hltv: RecentMatchMetricsBreakdown;
    adr: RecentMatchMetricsBreakdown;
    kd: RecentMatchMetricsBreakdown;
    kpr: RecentMatchMetricsBreakdown;
    udr: RecentMatchMetricsBreakdown;
    kast: RecentMatchMetricsBreakdown;
  };
}
```

---

## 3. Anatomia da Tupla Indexada Canônica V2 (22 Posições) e Tratamento Sub-pixel

Para eliminar a sobrecarga de repetição de chaves JSON em dezenas de milhares de snapshots por partida antes da compressão Gzip, o estado de cada jogador em um tick amostrado é serializado primariamente pela **tupla canônica estendida V2 (22 elementos)**.

A estrutura é confirmada e mantida em perfeita paridade entre o pipeline de ingestão (`PLAYER_TUPLE_SCHEMA` em `scripts/process-demo.mjs`), os contratos tipados (`RawPlayerTuple` em `src/types/replay.ts`), o validador em tempo de execução (`rawPlayerTupleSchema` em `src/contracts/replay.schema.ts`) e o normalizador do cliente (`normalizePlayerTuple` em `src/lib/replay/decompress.ts`):

```ts
export type RawPlayerTuple = [
  id: string | number,            // [0]  ID compacto referenciando o manifesto de atletas
  x: number,                      // [1]  Coordenada X no espaço mundial da Source 2 (float, 1 dec.)
  y: number,                      // [2]  Coordenada Y no espaço mundial da Source 2 (float, 1 dec.)
  z: number,                      // [3]  Coordenada Z no espaço mundial / altura (float, 1 dec.)
  yaw: number,                    // [4]  Ângulo horizontal de mira normalizado [0, 360] (float, 1 dec.)
  pitch: number,                  // [5]  Ângulo vertical de mira [-89, 89] (float)
  vx: number,                     // [6]  Velocidade vetorial no eixo X (float sub-pixel)
  vy: number,                     // [7]  Velocidade vetorial no eixo Y (float sub-pixel)
  vz: number,                     // [8]  Velocidade vetorial no eixo Z (float)
  hp: number,                     // [9]  Pontos de vida [0, 100] (inteiro)
  armor: number,                  // [10] Colete de proteção [0, 100] (inteiro)
  hasHelmet: number | boolean,    // [11] Flag binária: 1/true se possui capacete
  isAlive: number | boolean,      // [12] Flag binária: 1/true se vivo, 0 se abatido
  activeWeapon: string,           // [13] Nome da arma ativa (ex: 'weapon_ak47') ou ID
  money: number,                  // [14] Saldo/economia atual do atleta (derivado de 'account')
  team: number | string,          // [15] Lado tático: 'CT' | 'T' ou numérico (3=CT, 2=T)
  isDefusing: number | boolean,   // [16] Flag binária: 1/true se desarmando ativamente a C4
  hasDefuser: number | boolean,   // [17] Flag binária: 1/true se porta defuse kit
  isScoped: number | boolean,     // [18] Flag binária: 1/true se em mira telescópica (scope)
  isCrouching: number | boolean,  // [19] Flag binária: 1/true se agachado
  isAirborne: number | boolean,   // [20] Flag binária: 1/true se no ar (pulando / em queda)
  flashDuration: number           // [21] Duração restante do efeito de flash em segundos (float, 2 dec.)
];
```

### 3.1 Tratamento Sub-pixel / Float para Supressão de Jitter

A serialização das grandezas espaciais e angulares adota regras rígidas de precisão numérica com arredondamento controlado (`roundTo(val, decimals)`):

1. **Problema da Truncagem Inteira:** No motor Source 2, os jogadores deslocam-se continuamente através de coordenadas em ponto flutuante. Caso `worldX`, `worldY` e `worldZ` sejam convertidos para inteiros (`Math.round`), a interpolação linear (`lerp`) do Replayer 2D a 60 FPS sofre com o fenômeno de *stepping* (movimentação em degraus) e micro-trepidações visíveis (*jitter*), agravadas durante deslocamentos lentos (walk/sneak) ou trajetórias diagonais no radar.
2. **Resolução Sub-pixel Canônica (1 Casa Decimal):** As posições `x`, `y`, `z` e a orientação horizontal `yaw` são preservadas estritamente com **1 casa decimal** (`roundTo(val, 1)`):
   $$\text{pos}_{\text{canônica}} = \frac{\lfloor \text{pos} \times 10 + 0.5 \rfloor}{10}$$
   Essa granularidade confere precisão de $0.1$ unidade de mundo Source 2 (correspondendo a menos de $0.02\text{ px}$ na textura base $1024 \times 1024$ do radar), suprimindo $100\%$ das oscilações visuais sem inflar o payload JSON/gzip com dízimas de ponto flutuante de 64 bits (`double precision`).
3. **Velocidade Vetorial e Ângulos Contínuos:** As componentes de velocidade `vx`, `vy`, `vz` são transmitidas como números float contínuos para permitir o cálculo cinemático de `speed2D = Math.hypot(vx, vy)` no cliente; o ângulo `pitch` é limitado ao intervalo seguro $[-89^\circ, 89^\circ]$.
4. **Decaimento Contínuo de Cegueira (`flashDuration`):** Preservado com **2 casas decimais** (`roundTo(val, 2)`), garantindo esmaecimento linear visual suave no radar e no painel de atletas.

### 3.2 Compatibilidade Legada (Tupla de 14 Posições — `RawPlayerFrame`)

O parser e o normalizador polimórfico (`normalizePlayerTuple` e `decompressFrame` em `src/lib/replay/decompress.ts`) mantêm retrocompatibilidade transparente com a tupla compactada legada de 14 elementos:

```ts
export type RawPlayerFrame = [
  playerId: number,         // [0]  ID do jogador (1..10)
  worldX: number,           // [1]  Coordenada X mundial
  worldY: number,           // [2]  Coordenada Y mundial
  worldZ: number,           // [3]  Coordenada Z mundial
  yaw: number,              // [4]  Ângulo yaw [0, 360]
  hp: number,               // [5]  Pontos de vida [0, 100]
  armor: number,            // [6]  Colete [0, 100]
  hasHelmet: 0 | 1,         // [7]  Flag de capacete
  isAlive: 0 | 1,           // [8]  Flag de vivo
  isDefusing: 0 | 1,        // [9]  Flag de desarme
  isPlanting: 0 | 1,        // [10] Flag de plant
  activeWeaponId: number,   // [11] ID numérico da arma ativa
  flashDuration: number,    // [12] Duração de cegueira
  ping: number              // [13] Latência estimada
];
```

Ao processar uma tupla com menos de 21 posições, o normalizador detecta automaticamente o formato de 14 elementos, preenchendo as novas propriedades táticas (`isScoped`, `isCrouching`, `isAirborne`, velocidades `vx, vy, vz`) com valores padrão defensivos seguros.

### 3.3 Ciclo de Vida da C4 (`BombEvent`)
- **Tipos de Eventos:** `'planted' | 'defused' | 'exploded' | 'dropped' | 'pickup' | 'begin_defuse' | 'abort_defuse' | 'plant_start'`
- **Propriedades:** `tick`, `round`, `type`, `site` ('A' | 'B'), `playerId`, `x`, `y`, `z`, `hasKit` (booleano indicando kit de desarme).
- **Tempo de Desarme:** 5.0 segundos com kit (`hasKit: true`), 10.0 segundos sem kit (`hasKit: false`).

### 3.4 Utilitários e Trajetórias (`GrenadeTrajectory` & `GrenadeEffectEvent`)
- **Trajetória Balística (`GrenadeTrajectory`):** `{ id: string; throwerId: string; weapon: string; points: { x: number; y: number; z: number; tick: number }[] }`
- **Efeitos de Área Ativos (`GrenadeEffectEvent`):** `{ id: string; type: 'smoke' | 'molotov' | 'flash' | 'he'; x: number; y: number; z: number; startTick: number; endTick: number; radius: number }`

### 3.5 Eventos Estendidos de Combate (`WeaponFireEvent` & `PlayerHurtEvent`)
- **Disparo de Arma (`WeaponFireEvent`):** `{ tick: number; playerId: string; x: number; y: number; z: number; yaw: number; pitch: number; weapon: string }`
- **Dano Causado (`PlayerHurtEvent`):** `{ tick: number; attackerId: string; victimId: string; damage: number; hitgroup: number; remainingHp: number; remainingArmor: number }`
- **KillFeed Enriquecido (`KillFeedEvent`):** inclui flags `isAttackerBlind` e distância física euclidiana `distance` calculada no disparo fatal.

---

## 4. Fórmulas Matemáticas Canônicas da Valve (Radar $1024 \times 1024\text{ px}$)
As texturas oficiais de radar do Counter-Strike 2 possuem resolução base canônica de $1024 \times 1024\text{ pixels}$, cuja origem $(0, 0)$ situa-se no canto superior esquerdo da imagem.

### Conversão para Pixels ($1024 \times 1024$)
$$X_{\text{pixel}} = \frac{\text{worldX} - \text{pos\_x}}{\text{scale}}$$
$$Y_{\text{pixel}} = \frac{\text{pos\_y} - \text{worldY}}{\text{scale}}$$

### Conversão para Percentual Relativo ($0\% \text{ a } 100\%$)
$$X_{\text{percent}} = \left(\frac{X_{\text{pixel}}}{1024}\right) \times 100$$
$$Y_{\text{percent}} = \left(\frac{Y_{\text{pixel}}}{1024}\right) \times 100$$

### Tabela Oficial de Constantes dos Mapas Competitivos (MAP_CONFIGS)
| Mapa (CS2Map) | posX (pos_x) | posY (pos_y) | scale |
|---|---|---|---|
| de_mirage | -3230 | 1713 | 5.0 |
| de_inferno | -2087 | 3870 | 4.9 |
| de_dust2 | -2476 | 3239 | 4.4 |
| de_nuke | -3453 | 2888 | 7.0 |
| de_ancient | -2953 | 2164 | 5.5 |
| de_anubis | -2796 | 3328 | 5.22 |
| de_cache | -2000 | 3250 | 5.5 |

> **Nota sobre `de_nuke` (Dois Andares Verticais):** possui suporte a camadas verticais (`hasVerticalLayers: true`, `verticalThresholdZ: -495`, `lowerRadarImage: '/maps/de_nuke_lower_radar.png'`). Coordenadas com $Z < -495$ pertencem ao piso inferior (`lower`), e $Z \ge -495$ ao piso superior (`upper`).

---

## 5. Política de Ancoragem Central no Renderizador 2D (`translate(-50%, -50%)`)
Toda coordenada $(X_{\text{pixel}}, Y_{\text{pixel}})$ ou $(X_{\text{percent}}, Y_{\text{percent}})$ representa o centro geométrico exato da entidade no mapa (jogador, granada ou C4).

- **Em elementos DOM / CSS Overlay:** Qualquer marcador posicionado via `left: ${percentX}%` e `top: ${percentY}%` deve obrigatoriamente aplicar `transform: translate(-50%, -50%)`.
- **Em HTML5 Canvas 2D:** Primitivas radiais (`ctx.arc(pixelX, pixelY, radius, ...)`) já utilizam `(pixelX, pixelY)` como centro; sprites retangulares (`ctx.drawImage`) devem ser deslocados em `(-width / 2, -height / 2)`.