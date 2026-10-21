# Validação final — 21/10/2026

- Suíte completa: 127 testes aprovados, zero falhas (`logs/final-tests.json`).
- Após o último ajuste responsivo: 10 testes de replay/navegação aprovados (`logs/final-ui-tests.txt`).
- Build de produção e verificação de tipos: aprovados (`logs/final-build.txt`).
- Smoke HTTP: 12 rotas retornaram 200, incluindo páginas, replay binário e endpoints de estatísticas/heatmap (`logs/final-routes.json`).
- Integração PostgreSQL executada em schema temporário isolado: identidade determinística, agrupamento de mapas, substituição sem duplicação, histórico por mapa, rollback, nomes/lados, análise espacial e DELETE com remoção física. Schema e arquivos de teste removidos pelo teardown.
- Impeccable: detector sem ocorrências nos alvos verificados (`logs/design-detect.json`).
- Conferência visual: replay carregado com nomes reais, CT azul/TR amarelo e radar dimensionado na janela estreita disponível. Não foi realizada captura de desktop largo nesta rodada.

## Ambiente

O servidor de desenvolvimento preexistente compartilhava `.next` com o build e causava erros de chunks ausentes. A configuração agora aceita `NEXT_DIST_DIR`; a validação de produção usa `.next-production`, ignorada pelo Git. O servidor de desenvolvimento preexistente não foi encerrado.

## Limite do motor espacial

As roles são heurísticas de ocupação espacial, não uma classificação comprovada de intenção tática. A atribuição de zonas cobre Inferno, Mirage e Dust2; mapas/posições sem zona conhecida não recebem uma role inventada.
