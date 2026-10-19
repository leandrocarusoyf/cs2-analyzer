# Especificação Técnica 01 — Contratos de Dados e Coordenadas de Radar (CS2 Analyzer)

## 1. Decisão Arquitetural: Persistência 100% Local-First (PostgreSQL 16 + File System `.bin.gz`)

Toda a infraestrutura opera em regime **Zero Nuvem** (sem Supabase, S3 ou APIs remotas de armazenamento). Para garantir consultas sub-milissegundo em listagens, dashboards e filtros sem degradar o buffer cache do PostgreSQL local com matrizes de telemetria multi-megabyte, a persistência local é dividida em duas camadas estritas:

1. **PostgreSQL 16 Local (`cs2-postgres` / `cs2_analytics`) — Metadados Relacionais e KPIs**
   - Executado via container Docker (`postgres:16-alpine` na porta `5432`, conectado via `DATABASE_URL`).
   - Armazena de forma normalizada nas tabelas `matches`, `match_maps` e `player_stats` os metadados da partida (`match_date`, `team1`, `team2`, `format`, `score_t1`, `score_t2`, `winner`, `demo_hash`), estatísticas por mapa (`map_name`, `rounds_t1`, `rounds_t2`, `duration`) e indicadores de desempenho por atleta (`rating`, `adr`, `kast`, `kills`, `deaths`, `assists`, `ttd`, `ttk`, `fsp`, `metrics_json`).
   - Mantém a referência física `replay_path` na tabela `matches` apontando para o arquivo binário comprimido no sistema de arquivos local, além de sincronizar o snapshot de leitura rápida em `src/data/ingested-matches.json`.

2. **Sistema de Arquivos Local (`./data/replays/.../*.bin.gz`) — Telemetria Posicional Tick a Tick**
   - Armazena o pacote estruturado `ReplayDataPackage` (manifestos de jogadores/armas, rounds, eventos discretos de `damages`, `kills`, `utility`, `bomb`, `duels` e frames amostrados `RawFrame[]`).
   - O payload JSON é comprimido em binário via **Gzip nível máximo (`level: 9`)** e organizado sob a taxonomia determinística:
     `./data/replays/{mes-ano}/{dd-mm-aaaa}/{time1}_vs_{time2}_{formato}/{nome_original_da_demo}.bin.gz`
   - Carregado e descomprimido sob demanda apenas quando o analista abre o reprodutor tático 2D de uma partida específica.

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

3. Anatomia da Tupla Indexada RawPlayerFrame
Para eliminar a sobrecarga de repetição de chaves JSON em dezenas de milhares de snapshots por partida antes da compressão Gzip, o estado de cada jogador em um tick amostrado é serializado como uma tupla estrita de 14 elementos ordenados (RawPlayerFrame):
```ts
type RawPlayerFrame = [
  playerId: number,       // [0] ID interno compacto referenciando playersManifest[].id
  worldX: number,         // [1] Coordenada X (Source 2)
  worldY: number,         // [2] Coordenada Y (Source 2)
  worldZ: number,         // [3] Coordenada Z (altura/andar)
  yaw: number,            // [4] Ângulo horizontal de mira [0, 360]
  hp: number,             // [5] Pontos de vida [0, 100]
  armor: number,          // [6] Colete [0, 100]
  hasHelmet: 0 | 1,       // [7] 1 se possui capacete
  isAlive: 0 | 1,         // [8] 1 se vivo, 0 se abatido
  isDefusing: 0 | 1,      // [9] 1 se desarmando a C4
  isPlanting: 0 | 1,      // [10] 1 se plantando a C4
  activeWeaponId: number, // [11] ID da arma equipada
  flashDuration: number,  // [12] Tempo restante de cegueira (segundos)
  ping: number            // [13] Latência em ms
];
```

4. Fórmulas Matemáticas Canônicas da Valve (Radar $1024 \times 1024\text{ px}$)
As texturas oficiais de radar do Counter-Strike 2 possuem resolução base canônica de $1024 \times 1024\text{ pixels}$, cuja origem $(0, 0)$ situa-se no canto superior esquerdo da imagem.

Conversão para Pixels ($1024 \times 1024$)
$$X_{\text{pixel}} = \frac{\text{worldX} - \text{pos\_x}}{\text{scale}}$$
$$Y_{\text{pixel}} = \frac{\text{pos\_y} - \text{worldY}}{\text{scale}}$$

Conversão para Percentual Relativo ($0\% \text{ a } 100\%$)
$$X_{\text{percent}} = \left(\frac{X_{\text{pixel}}}{1024}\right) \times 100$$
$$Y_{\text{percent}} = \left(\frac{Y_{\text{pixel}}}{1024}\right) \times 100$$

Tabela Oficial de Constantes dos Mapas Competitivos (MAP_CONFIGS)
| Mapa (CS2Map) | posX (pos_x) | posY (pos_y) | scale |
|---|---|---|---|
| de_mirage | -3230 | 1713 | 5.0 |
| de_inferno | -2087 | 3870 | 4.9 |
| de_dust2 | -2476 | 3239 | 4.4 |
| de_nuke | -3453 | 2888 | 7.0 |
| de_ancient | -2953 | 2164 | 5.5 |
| de_anubis | -2796 | 3328 | 5.22 |
| de_cache | -2000 | 3250 | 5.5 |

Nota sobre de_nuke (Dois Andares Verticais): possui suporte a camadas verticais (hasVerticalLayers: true, verticalThresholdZ: -495, lowerRadarImage: '/maps/de_nuke_lower_radar.png'). Coordenadas com $Z < -495$ pertencem ao piso inferior (lower), e $Z \ge -495$ ao piso superior (upper).

5. Política de Ancoragem Central no Renderizador 2D (translate(-50%, -50%))
Toda coordenada $(X_{\text{pixel}}, Y_{\text{pixel}})$ ou $(X_{\text{percent}}, Y_{\text{percent}})$ representa o centro geométrico exato da entidade no mapa (jogador, granada ou C4).

Em elementos DOM / CSS Overlay: Qualquer marcador posicionado via `left: ${percentX}%` e `top: ${percentY}%` deve obrigatoriamente aplicar `transform: translate(-50%, -50%)`.

Em HTML5 Canvas 2D: Primitivas radiais (`ctx.arc(pixelX, pixelY, radius, ...)`) já utilizam `(pixelX, pixelY)` como centro; sprites retangulares (`ctx.drawImage`) devem ser deslocados em `(-width / 2, -height / 2)`.