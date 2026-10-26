import fs from 'fs';

async function run() {
    const demoPath = process.argv[2] || 'furia-vs-aurora-m1-dust2.dem';

    if (!fs.existsSync(demoPath)) {
        console.error(`❌ Arquivo de demo não encontrado: ${demoPath}`);
        process.exit(1);
    }

    console.log(`\n🔍 Carregando demoparser2 dinamicamente...`);

    let parserModule = null;
    for (const pkg of ['@laihoe/demoparser2', 'demoparser2']) {
        try {
            const mod = await import(pkg);
            parserModule = mod.default ?? mod;
            console.log(`✅ Parser carregado com sucesso via: "${pkg}"`);
            break;
        } catch (e) { }
    }

    if (!parserModule) {
        console.error('❌ Falha ao inicializar o demoparser2.');
        process.exit(1);
    }

    const { parseEvents } = parserModule;

    console.log(`🔍 Extraindo eventos de combate em: ${demoPath}\n`);

    const hurts = parseEvents(demoPath, ['player_hurt']);
    const fires = parseEvents(demoPath, ['weapon_fire']);
    const deaths = parseEvents(demoPath, ['player_death']);

    console.log(`✅ Eventos carregados: ${hurts.length} danos, ${fires.length} tiros, ${deaths.length} mortes.`);

    // 1. Indexar disparos por atacante
    const firesByPlayer = new Map();
    for (const f of fires) {
        const sid = f.user_steamid;
        if (!sid) continue;
        if (!firesByPlayer.has(sid)) firesByPlayer.set(sid, []);
        firesByPlayer.get(sid).push(f.tick);
    }

    // 2. Filtro de exclusão: ignora utilitárias, facadas e Zeus
    const nonAimWeapons = ['hegrenade', 'inferno', 'flashbang', 'decoy', 'smokegrenade', 'knife', 'taser'];

    const sampleDeaths = deaths
        .filter(d =>
            d.attacker_steamid &&
            d.user_steamid &&
            d.attacker_steamid !== d.user_steamid &&
            !nonAimWeapons.includes(d.weapon)
        )
        .slice(0, 15); // Aumentei a amostra para 15 para vermos mais exemplos

    console.log('\n--- AMOSTRA DE CONFRONTOS REAIS (TTD & AIM REFINADOS) ---');

    for (const duel of sampleDeaths) {
        const killer = duel.attacker_steamid;
        const victim = duel.user_steamid;
        const deathTick = duel.tick;

        // Danos na janela do duelo (reduzida para ~4 segundos no máximo)
        const duelHurts = hurts.filter(h =>
            h.attacker_steamid === killer &&
            h.user_steamid === victim &&
            h.tick <= deathTick &&
            h.tick >= deathTick - 256
        );

        if (duelHurts.length === 0) continue;

        const firstDamageTick = duelHurts[0].tick;
        const playerFires = firesByPlayer.get(killer) || [];

        // Todos os tiros do jogador antes ou no exato tick do primeiro dano
        const firesBeforeHit = playerFires.filter(t => t <= firstDamageTick);

        let engagementStartTick = firstDamageTick;
        let validBullets = 0;

        // Lógica de Rajada Contínua: Analisa de trás para frente (do acerto para o passado)
        if (firesBeforeHit.length > 0) {
            let lastTickChecked = firstDamageTick;

            for (let i = firesBeforeHit.length - 1; i >= 0; i--) {
                const currentShotTick = firesBeforeHit[i];
                const gap = lastTickChecked - currentShotTick;

                // Se o intervalo entre os tiros for maior que ~1 segundo (64 ticks a 64-tickrate),
                // consideramos que a rajada anterior era outro engajamento/spam e quebramos a conta.
                if (gap > 64 && validBullets > 0) {
                    break;
                }

                engagementStartTick = currentShotTick;
                lastTickChecked = currentShotTick;
                validBullets++;
            }
        }

        const tickIntervalMs = 15.625; // 64-tick
        let ttdMs = Math.round((firstDamageTick - engagementStartTick) * tickIntervalMs);

        // Formatação visual para o terminal
        let ttdDisplay = `${ttdMs}ms`;
        if (ttdMs === 0) ttdDisplay = '0ms (Tiro limpo / 1ª bala)';
        else if (ttdMs > 1200) ttdDisplay = `${ttdMs}ms (Possível varado/spam - Ignorar na média)`;

        // Formatação do Dano Real (lidando com overkill)
        const totalDmgBruto = duelHurts.reduce((acc, h) => acc + (h.dmg_health || 0), 0);
        const dmgDisplay = totalDmgBruto > 100 ? `100 (Overkill: ${totalDmgBruto})` : totalDmgBruto;

        console.log(`[Duelo] ${duel.attacker_name} (${duel.weapon}) vs ${duel.user_name}:`);
        console.log(`   └─ 1º Dano no tick: ${firstDamageTick} | Balas no engajamento: ${validBullets}`);
        console.log(`   └─ TTD Real: ${ttdDisplay} | Dano total: ${dmgDisplay} HP`);
    }
}

run().catch(console.error);