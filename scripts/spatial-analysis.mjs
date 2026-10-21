// Spatial roles are occupancy heuristics, not claims about a player's intent.
// Coordinates are Source world units. Unknown maps retain numeric zone labels.
const ZONES = {
  de_inferno: [{name:'B',x:400,y:2800,radius:1050},{name:'A',x:2000,y:600,radius:1000},{name:'Mid',x:500,y:1000,radius:850}],
  de_mirage: [{name:'B',x:-2000,y:500,radius:900},{name:'A',x:750,y:-2200,radius:1050},{name:'Mid',x:-700,y:-500,radius:1100}],
  de_dust2: [{name:'B',x:-1500,y:2600,radius:850},{name:'A',x:1100,y:2500,radius:850},{name:'Mid',x:0,y:1400,radius:900}],
};
export function sideForRound(initial, round) {
  const swap = round <= 24 ? round > 12 : Math.floor((round-25)/3)%2===1;
  return swap ? initial==='CT' ? 'T' : 'CT' : initial;
}
export function analyzeSpatial(replay, player, startSecond=10, endSecond=50) {
  const tickrate=replay.tickrate || 64;
  const map=replay.map;
  const buckets=new Map(); const cells=new Map(); const sideTotals={CT:0,T:0};
  for(const round of replay.rounds || []) {
    const start=round.freezeEndTick ?? round.startTick;
    let previousTick=-Infinity;
    for(const frame of round.frames || []) {
      const tick=Array.isArray(frame)?frame[0]:frame.tick;
      if(tick<start+startSecond*tickrate || tick>start+endSecond*tickrate || tick-previousTick<tickrate)continue;
      previousTick=tick;
      const p=(Array.isArray(frame)?frame[1]:frame.players).find(p=>String(Array.isArray(p)?p[0]:p.id)===String(player.id));
      if(!p)continue;
      const extended=Array.isArray(p)&&p.length>=22;
      const hp=Array.isArray(p)?p[extended?9:p.length===17?6:5]:p.hp;
      if(!(hp>0))continue;
      const x=Number(Array.isArray(p)?p[1]:p.x),y=Number(Array.isArray(p)?p[2]:p.y);
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const side=extended ? (p[15]===3||p[15]==='CT'?'CT':'T') : sideForRound(player.initialTeam || player.team,round.roundNumber);
      sideTotals[side]++;
      const cellKey=`${side}:${Math.floor(x/160)}:${Math.floor(y/160)}`;
      const cell=cells.get(cellKey)||{x:0,y:0,weight:0,side:side.toLowerCase()};
      cell.x+=x;cell.y+=y;cell.weight++;cells.set(cellKey,cell);
      const zone=(ZONES[map]||[]).map(z=>({...z,d:Math.hypot(x-z.x,y-z.y)})).filter(z=>z.d<z.radius).sort((a,b)=>a.d-b.d)[0];
      if(!zone)continue; // Don't assign a tactical role to spawn or unknown space.
      const category=side==='CT' ? zone.name==='Mid'?'Rotation':'Anchor' : zone.name==='Mid'?'Lurk':'Pack';
      const mapLabel=map.replace(/^de_/,'').replace(/^./,c=>c.toUpperCase());
      const roleName=`${mapLabel} ${zone.name} ${category==='Lurk'?'Lurker':category}`;
      const key=`${side}:${zone.name}`;const b=buckets.get(key)||{id:key,roleName,category,side,sumX:0,sumY:0,sampleCount:0};
      b.sumX+=x;b.sumY+=y;b.sampleCount++;buckets.set(key,b);
    }
  }
  const clusters=[...buckets.values()].filter(b=>b.sampleCount>=3).map(b=>({id:b.id,roleName:b.roleName,category:b.category,side:b.side,centroid:{x:b.sumX/b.sampleCount,y:b.sumY/b.sampleCount},sampleCount:b.sampleCount,frequencyPct:100*b.sampleCount/sideTotals[b.side]})).sort((a,b)=>b.sampleCount-a.sampleCount);
  return {steamId:player.steamId,playerName:player.name,map,timeWindowSeconds:[startSecond,endSecond],totalSamples:sideTotals.CT+sideTotals.T,clusters,heatmapPoints:[...cells.values()].map(c=>({...c,x:c.x/c.weight,y:c.y/c.weight})),roles:{ct:clusters.find(c=>c.side==='CT')?.roleName || null,t:clusters.find(c=>c.side==='T')?.roleName || null}};
}
