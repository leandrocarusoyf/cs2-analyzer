import { query, pool } from '../src/lib/db.ts';

async function main() {
  const matches = await query(`SELECT id FROM matches WHERE event_name = 'CROSSFIRE Season 6'`);
  const ids = matches.rows.map((r: any) => r.id);
  if (ids.length > 0) {
    await query('DELETE FROM player_stats WHERE match_id = ANY($1::uuid[])', [ids]);
    await query('DELETE FROM match_maps WHERE match_id = ANY($1::uuid[])', [ids]);
    await query('DELETE FROM matches WHERE id = ANY($1::uuid[])', [ids]);
    console.log(`Successfully removed ${ids.length} mock matches and their associated players.`);
  } else {
    console.log('No mock matches found.');
  }
  await pool.end();
}

main().catch(console.error);
