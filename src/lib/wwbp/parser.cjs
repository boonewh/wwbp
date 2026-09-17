/* Report data stays distinct from map geography and from the prior order echo. */
(function (root) {
  'use strict';
  const FIELDS = ['Army', 'Navy', 'AirF', 'Missiles', 'ABMs', 'Industry'];
  const getIds = s => [...s.matchAll(/\[(\d+)(?::[^\]]*)?\]/g)].map(m => +m[1]);
  function parseReport(raw, filename = 'Imported report') {
    if (typeof raw !== 'string' || raw.length > 2_000_000) throw Error('Use a text report smaller than 2 MB.');
    const text = raw.replace(/\r/g, '');
    const header = text.match(/^Game (\S+), Turn (\d+), Player \[(\d+)(?::([^\]]+))?\]/m);
    if (!header) throw Error('Could not find a WWBP game, turn, and player heading.');
    const start = text.indexOf('Forces under your control:');
    const ranking = text.indexOf('Occupied Countries', start);
    const end = text.indexOf('Visible forces of all players:', ranking);
    if (start < 0 || ranking < 0 || end < 0) throw Error('The report is incomplete: forces, occupied countries, or visible-forces section is missing.');
    const r = {game:header[1], turn:+header[2], player:+header[3], position:header[4] || `Player ${header[3]}`,
      filename, raw:text, spaces:{}, players:{}, ranking:[], totals:{}, errors:[], warnings:[], own:{}, diplomacy:{}};
    for (const m of text.matchAll(/\[(\d+):([^\]]+)\]/g)) r.players[m[1]]=m[2];
    const top = text.slice(0, start);
    for (const key of ['Spies','CounterSpies','Dollars']) {
      const m=top.match(new RegExp(`\\b${key}=([\\d.]+)`));
      if (!m) throw Error(`Missing ${key} reserve in report heading.`);
      r[key]=+m[1];
    }
    r.defaults=top.match(/Defaults=\(([^)]*)\)/)?.[1] || '';
    r.multipliers=Object.fromEntries([...(top.match(/Multipliers=\(([^)]*)\)/)?.[1] || '').matchAll(/([A-Z])(\d+(?:\.\d+)?)/g)].map(m=>[m[1],+m[2]]));
    for (const [key,label] of Object.entries({allies:'Allies',enemies:'Enemies',incoming:'Players declaring you ally',sharing:'Spies you are sharing',shared:'Spies shared with you',permits:'Permits'})) {
      const match=top.match(new RegExp(`^\\s*${label}=\\(([\\s\\S]*?)\\)`, 'm'));
      r.diplomacy[key]=match ? getIds(match[1]) : [];
    }
    for (const line of text.slice(start,ranking).split('\n')) {
      const m=line.match(/^([A-Z]{3})\s+(\*\s+)?((?:[\d.+-]+\s*)+)$/);
      if (!m) continue;
      const cells=m[3].trim().split(/\s+/).map(v=>v==='-'?0:Number(v.replace(/\+$/,'')));
      const sea=m[1].startsWith('W');
      if (cells.length < (sea?3:m[2]?6:7) || cells.some(n=>!Number.isFinite(n))) throw Error(`Could not parse forces for ${m[1]}.`);
      r.own[m[1]]={code:m[1],kind:sea?'sea':m[2]?'minor':'occupied',values:Object.fromEntries(FIELDS.map((k,i)=>[k,cells[i] || 0])),HPI:sea?null:cells[6]};
    }
    if (!Object.keys(r.own).length) throw Error('No forces-under-control rows were recognized.');
    const summary=text.slice(start,ranking).split('\n').find(l=>/^\s+(?:[\d]+\s+){5}[\d]+\s*$/.test(l));
    if (!summary) throw Error('The forces-under-control totals are missing.');
    const expected=summary.trim().split(/\s+/).map(Number);
    FIELDS.forEach((k,i)=>{
      r.totals[k]=Object.values(r.own).reduce((n,s)=>n+s.values[k],0);
      if(r.totals[k]!==expected[i]) throw Error(`The ${k} rows do not match the report total; import stopped to avoid using incomplete data.`);
    });
    const body=text.slice(ranking,end);
    for(const m of body.matchAll(/^\s+\[(\d+)(?::[^\]]+)?\]\s+(\d+)\s*$/gm)) r.ranking.push({player:+m[1],count:+m[2]});
    // Unwrap continuation lines first, then split both one-column and two-column records.
    const flat=body.replace(/\n[ \t]+/g,' ');
    const recs=[...flat.matchAll(/(?:^|\s)([A-Z]{3})\s+(\*|\[\d+(?::[^\]]+)?\])/g)];
    for(let i=0;i<recs.length;i++) {
      const m=recs[i], code=m[1];
      const rawRecord=flat.slice(m.index,recs[i+1]?.index ?? flat.length).trim();
      const sea=code.startsWith('W');
      const visible=sea || /\b(?:MaxInd|Industry|TaxBase)=/.test(rawRecord);
      const s={code,kind:sea?'sea':m[2]==='*'?'minor':'occupied',owner:sea||m[2]==='*'?null:+m[2].match(/\d+/)[0],controller:null,
        visible,values:{},suppressed:{},popularity:{},fleets:[],raw:rawRecord};
      if(sea) {
        for(const p of rawRecord.matchAll(/\[(\d+)(?::[^\]]+)?\]\(([^)]*)\)/g)) {
          const values=Object.fromEntries(FIELDS.map(k=>[k,0]));
          for(const f of p[2].matchAll(/(Army|Navy|AirF)=([\d.]+)/g)) values[f[1]]=+f[2];
          s.fleets.push({player:+p[1],values});
        }
        if(r.own[code]) s.values={...r.own[code].values};
      } else if(visible) {
        FIELDS.concat(['TaxBase']).forEach(k=>{s.values[k]=0;s.suppressed[k]=0;});
        for(const f of rawRecord.matchAll(/(MaxInd|TaxBase|Industry|Army|Navy|AirF|Missiles|ABMs|HPI|Spies)=(-?[\d.]+)(?:<([\d.]+)>)?/g)) {
          if(['HPI','MaxInd','Spies'].includes(f[1])) s[f[1]]=+f[2];
          else {s.values[f[1]]=+f[2];s.suppressed[f[1]]=+(f[3] || 0);}
        }
      }
      for(const p of rawRecord.matchAll(/\[(\d+)(?::[^\]]+)?\]=(-?[\d.]+)/g)) s.popularity[p[1]]=+p[2];
      if(s.kind==='minor' && visible) {
        const scores=Object.entries(s.popularity).sort((a,b)=>b[1]-a[1]);
        if(scores.length && scores[0][1]>0 && scores[0][1]>(scores[1]?.[1] ?? 0)) s.controller=+scores[0][0];
      }
      r.spaces[code]=s;
    }
    for(const [code,o] of Object.entries(r.own)) {
      if(!r.spaces[code]) r.spaces[code]={code,kind:o.kind,values:{...o.values},suppressed:{},popularity:{},fleets:[],visible:true,raw:'Forces under your control table',HPI:o.HPI};
      const s=r.spaces[code];s.commanded=true;
      if(o.kind==='minor') s.controller=r.player;
      if(o.kind==='occupied') s.owner=r.player;
    }
    r.errors=[...text.matchAll(/^<([^\n]*--[^\n]*)>\s*$/gm)].map(m=>m[1]);
    const echo=text.match(/Order-count:\s*(\d+)\s*\n([\s\S]*?)(?:\n-{5,}|$)/);
    r.orderCount=echo?+echo[1]:0;r.orderEcho=echo?.[2].trim() || '';
    r.due=text.match(/^Due [^\n]+/m)?.[0] || text.match(/^\s*Turn \d+ for this game is due [^\n]+/m)?.[0].trim() || 'Not stated in report';
    r.caught=[];
    const caught=text.match(/(?:^|\n)Spies caught\n([\s\S]*?)(?=\n\n|\nSea combat|\n-{5,})/);
    if(caught) for(const line of caught[1].split('\n')) {
      const id=line.match(/^\[(\d+)(?::[^\]]+)?\]/);
      if(id && +id[1]===r.player) for(const m of line.matchAll(/([A-Z]{3})=(\d+)/g)) r.caught.push({code:m[1],count:+m[2]});
    }
    return r;
  }
  function metrics(r) {
    const own=Object.values(r.own), occupied=own.filter(s=>s.kind==='occupied'), minors=own.filter(s=>s.kind==='minor');
    const sum=(rows,k)=>rows.reduce((n,s)=>n+s.values[k],0);
    const suppressed=k=>occupied.reduce((n,s)=>n+(r.spaces[s.code]?.suppressed[k] || 0),0);
    return {occupied:occupied.length,minors:minors.length,sea:own.filter(s=>s.kind==='sea').length,
      industry:r.totals.Industry,occupiedIndustry:sum(occupied,'Industry'),minorIndustry:sum(minors,'Industry'),
      suppressedIndustry:suppressed('Industry'),suppressedAir:suppressed('AirF'),suppressedTax:suppressed('TaxBase'),cash:r.Dollars};
  }
  function compare(previous,current) {
    const result={captures:[],lost:[],controlGained:[],controlLost:[],intelGained:[],intelLost:[],ownership:[]};
    if(!previous)return result;
    for(const code of new Set([...Object.keys(previous.spaces),...Object.keys(current.spaces)])) {
      const a=previous.spaces[code],b=current.spaces[code];
      if(!b || b.kind==='sea')continue;
      if(b.owner===current.player && a?.owner!==current.player)result.captures.push(code);
      if(a?.owner===current.player && b.owner!==current.player)result.lost.push(code);
      if(b.controller===current.player && a?.controller!==current.player)result.controlGained.push(code);
      if(a?.controller===current.player && b.controller!==current.player && b.owner!==current.player)result.controlLost.push(code);
      if(b.visible && !a?.visible)result.intelGained.push(code);
      if(!b.visible && a?.visible)result.intelLost.push(code);
      if(a && a.owner!==b.owner)result.ownership.push(code);
    }
    return result;
  }
  const api={parseReport,metrics,compare,FIELDS};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  else root.WWBP=api;
})(typeof globalThis!=='undefined'?globalThis:this);
