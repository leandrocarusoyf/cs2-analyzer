# Agregação da home

## HLTV — GET /api/home/live-matches

O carregador de lista e detalhes usa User-Agent de Chrome no Windows, Referer da HLTV e cabeçalhos Accept/Accept-Language. Todos os jogos ao vivo retornados pela fonte são mantidos, independentemente de estrelas ou ranking.

Para encaminhar as requisições por um proxy HTTP/HTTPS, configure no ambiente do servidor e reinicie a aplicação:

```dotenv
HLTV_PROXY_URL=http://usuario:senha@proxy.example:8080
```

Sem essa variável, a conexão é direta. Cabeçalhos de navegador não garantem que o Cloudflare libere um IP bloqueado. Bloqueios e indisponibilidades retornam HTTP 502 com `Cache-Control: no-store`; não são convertidos em listas vazias. O cache de sucesso dura 60 segundos.

## Notícias — GET /api/news/feed

`category_tag` aceita exclusivamente `Campeonatos` ou `Atualizações`. A classificação considera título e resumo completo antes do corte para exibição, ignora caixa/acentos e desconsidera as categorias fornecidas pelo RSS. Os termos de campeonatos são `campeonato`, `circuit`, `major`, `playoffs`, `classifica`, `fase final` e `grupo`. O cache dura 30 minutos.

## VRS — GET /api/rankings/vrs

Esta versão fornece dados **simulados**, identificados pelo cabeçalho `X-VRS-Data-Source: simulated`. Não representa o ranking oficial atual. A fonte oficial para a futura integração é https://github.com/ValveSoftware/counter-strike_regional_standings. A separação de Americas em SA/NA ainda precisa de uma regra de classificação.

Sem filtro, a resposta é um objeto com exatamente quatro chaves: `SA`, `EU`, `NA`, `ASIA`. Cada lista contém times com `name` (string), `points` (number), `rank` (number), `change` (string) e `change_type` (`up`, `down` ou `neutral`), além dos campos de apresentação existentes.

`?region=ASIA` retorna somente a lista asiática. Regiões inválidas, incluindo `APAC`, retornam HTTP 400. `/api/home/vrs` permanece como alias com o mesmo contrato. O intervalo de revalidação é de uma hora.
