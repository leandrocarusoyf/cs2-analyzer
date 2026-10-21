import React from 'react';
import {it,expect,afterEach,vi} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {TabRoles} from '../src/components/stats/TabRoles.tsx';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('loads only the requested player and filters spatial roles by side',async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({map:'de_inferno',totalSamples:40,heatmapPoints:[],clusters:[{id:'ct',side:'CT',roleName:'Inferno B Anchor',frequencyPct:80,sampleCount:32,category:'Anchor'},{id:'t',side:'T',roleName:'Inferno Mid Lurker',frequencyPct:20,sampleCount:8,category:'Lurk'}]})});vi.stubGlobal('fetch',fetch);
 render(<TabRoles playerName="1001"/>);expect(await screen.findByText('Inferno B Anchor')).toBeTruthy();expect(screen.queryByText('Inferno Mid Lurker')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'TR'}));expect(screen.getByText('Inferno Mid Lurker')).toBeTruthy();expect(fetch.mock.calls[0][0]).toContain('/1001/spatial');
});
it('reports unavailable telemetry instead of inventing roles',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));render(<TabRoles playerName="missing"/>);expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('Inferno B Anchor')).toBeNull();});
