# Especificação Técnica 04 — Visões Analíticas de Player Stats e Taxonomia de Métricas

## 1. Taxonomia dos Componentes Analíticos (`src/components/stats/`)

O painel de **Player Stats** organiza o perfil de desempenho do atleta em 5 abas modulares sincronizadas de forma reativa com o roteamento via `URLSearchParams` (`?tab=intro|roles|weapons|buy_types|maps`):

| Componente | Rota/Tab | Finalidade Tática |
| :--- | :--- | :--- |
| `TabIntro` | `tab=intro` (padrão) | **Visão Geral Executiva:** Cabeçalho de identidade, 4 KPIs essenciais (ADR, K/D, KPR, DPR) comparados a referências competitivas, histórico recente de Rating e desempenho em compras. |
| `TabRoles` | `tab=roles` | **Perfil de Função & Radar Multidimensional:** Gráfico de teia com 12 métricas normalizadas e atribuição de funções táticas por lado (CT e TR). |
| `TabWeapons` | `tab=weapons` | **Estatísticas de Armamento & Eficiência:** Destaque de armas principais, tabela com percentuais de uso, ADR, taxas de vitória em duelos e relação custo-benefício. |
| `TabBuyTypes` | `tab=buy_types` | **Economia & Tipos de Compra:** Agrupamento por cenários económicos (Equal Buy, Better Buy, Worse Buy) e impacto de dano residual (ADR) em rondas eco. |
| `TabMaps` | `tab=maps` | **Desempenho por Mapa:** Cards dos 7 cenários da rotação ativa e tabela discriminando métricas entre os lados CT e TR. |

---

## 2. Fórmulas de Normalização do Gráfico Radar (12 Eixos)

O gráfico de teia de aranha (`TabRoles`) converte métricas contínuas e heterogéneas em uma escala normalizada $[0, 100]$ relativa à distribuição competitiva através da função pura `normalizeRadarMetric(value, minRef, maxRef)`:

$$\text{score}_{\text{norm}} = \text{clamp}\left( \frac{\text{valor} - \text{minRef}}{\text{maxRef} - \text{minRef}} \times 100, \, 0, \, 100 \right)$$

### Limites de Referência Canónicos para os 12 Eixos

| Índice | Métrica | Limite Inferior (`minRef`) | Limite Superior (`maxRef`) | Significado Tático |
| :---: | :--- | :---: | :---: | :--- |
| 1 | **Rating** | `0.60` | `1.50` | Impacto consolidado geral |
| 2 | **ADR** | `50.0` | `105.0` | Volume de dano médio por ronda |
| 3 | **Opening Attempts** | `10.0%` | `35.0%` | Proatividade na busca do primeiro duelo |
| 4 | **Opening KD** | `0.50` | `1.70` | Eficiência na conversão de duelos iniciais |
| 5 | **Trade Kills** | `0.10 / rd` | `0.35 / rd` | Capacidade de vingar companheiros abatidos |
| 6 | **KPR** | `0.50` | `0.95` | Frequência de abates |
| 7 | **KD** | `0.70` | `1.50` | Rácio abates / mortes |
| 8 | **DPR** | `0.85` | `0.50` | Sobrevivência (escala invertida: menor valor é melhor) |
| 9 | **Traded Deaths** | `10.0%` | `30.0%` | Mortes que resultam em reabate favorável |
| 10 | **UDR** | `2.0` | `15.0` | Dano utilitário por ronda (HEs, Molotovs) |
| 11 | **Flash Assists** | `0.02 / rd` | `0.18 / rd` | Cegueiras que facilitam abates aliados |
| 12 | **KAST** | `60.0%` | `85.0%` | Consistência de participação em rondas |

---

## 3. Critérios de Divisão Tática (CT vs. TR) e Categorização Económica

### 3.1 Divisão por Lado Tático
- **Lado CT:** Focado em retenção de bomb, tempo de sobrevivência e apoio em retakes. Classificado nos papéis:
  * `allround`: Versatilidade de posições.
  * `anchor`: Fechamento e contenção de bombsite.
  * `rotation`: Reforço veloz e reconquista.
- **Lado TR:** Focado em controle de espaço, abertura de sítio e corte de rotação. Classificado nos papéis:
  * `allround`: Apoio coordenado.
  * `lurk`: Infiltração e corte de rotações.
  * `half_lurk`: Domínio do meio/secundário.
  * `pack`: Entrada no sítio e troca rápida de fogo.

### 3.2 Categorização Económica (Buy Types)
As rondas são segmentadas comparando o valor médio de inventário das duas equipas no início da fase de compra:

1. **Equal Buy ($|\Delta_{\text{equip}}| \le \$1.200$):** Confronto com armas principais e colete pleno em ambos os lados.
2. **Better Buy ($\Delta_{\text{equip}} > \$1.200$ a favor):** Vantagem de rifles/AWP contra submetralhadoras/pistolas adversárias.
3. **Worse Buy ($\Delta_{\text{equip}} < -\$1.200$ contra):** Rondas forçadas ou de economia estrita, avaliando o dano residual infligido.

### 3.3 Economy Rating (Dano por Investimento)
Calcula a taxa de conversão económica de cada arma e jogador:
$$\text{Economy Rating} = \frac{\text{Dano Total Causado}}{\text{Dinheiro Gasto}} \times 1.000$$
Mede quantos pontos de dano são entregues a cada $\$1.000$ investidos pelo atleta.

