#!/usr/bin/env node
/** Reproducible OFFLINE Canvas inspection of the actual TypeScript renderer.
 * Run from repo root: node output/skill-effects/render-offline.cjs [--closeups]
 * Requires already-installed @napi-rs/canvas and typescript. No browser/network.
 * Geometry is based on output/combat-unit-layout/result.json. This is NOT DOM/browser QA.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '../..');
const out = __dirname;
const closeups = process.argv.includes('--closeups') ? path.join(out, 'closeups') : null;
if(closeups)fs.mkdirSync(closeups,{recursive:true});
require.extensions['.ts'] = (module, file) => {
  module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
};
const dir = path.join(root, 'app/game/rpg/components/combat/effects');
const { renderSkillEffect } = require(path.join(dir, 'renderSkillEffect.ts'));
const { EFFECT_PROFILES } = require(path.join(dir, 'effectRegistry.ts'));
const { getEffectTiming } = require(path.join(dir, 'effectTimeline.ts'));
const mage = ['fireball', 'ice-arrow', 'frost-nova', 'lightning', 'chain-lightning', 'shield', 'meteor', 'arcane-missile', 'element-cataclysm', 'charm-light'];
const layouts = JSON.parse(fs.readFileSync(path.join(root, 'output/combat-unit-layout/result.json'))).results;
const report = { mode: 'OFFLINE Canvas rendering checks; not browser QA', sourceHashes: {}, geometrySource: 'output/combat-unit-layout/result.json and visually inspected mobile-320.png', mageProfiles: mage, profiles: Object.keys(EFFECT_PROFILES).length, frames: [], failures: [], notes: ['Actual renderSkillEffect.ts loaded through an in-memory TypeScript CommonJS transpile hook', 'Repository pixel maps and sprites with approximation of existing UI bars and labels; no DOM/CSS exercised', 'Viewport 320 => 294px arena; viewport 640 => 606px arena', 'One-target scenario uses first measured enemy slot, matching effectAnchors fallback behavior', 'Sprites and map use nearest-neighbor image scaling. Canvas overlay stays antialiased as in application.', 'Player is the gold initial/avatar circle cropped from the existing mobile-320.png reference; no character UI changes implied'] };
for (const file of ['renderSkillEffect.ts','magicEffects.ts','elementalDrawing.ts','physicalEffects.ts','effectDrawing.ts','effectTimeline.ts','effectRegistry.ts']) report.sourceHashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex');
function checkedContext(ctx, stats) {
  return new Proxy(ctx, { get(target, key) {
    const val=target[key];
    if(typeof val !== 'function') return val;
    return (...args) => {
      stats.calls++;
      for(const a of args) if(typeof a==='number' && !Number.isFinite(a)) throw Error(`${String(key)} nonfinite ${a}`);
      if(key==='arc' && args[2]<0) throw Error('negative arc radius');
      if(key==='ellipse' && (args[2]<0 || args[3]<0)) throw Error('negative ellipse radius');
      if(key==='save') stats.balance++;
      if(key==='restore') { stats.balance--; if(stats.balance<0) throw Error('unbalanced restore'); }
      return val.apply(target,args);
    };
  },set(target,key,val){ if(typeof val==='number'&&!Number.isFinite(val)) throw Error(`nonfinite ${String(key)}`); target[key]=val; return true; }});
}
function geometry(viewport, count) {
  const layout = layouts.find(x=>x.width===viewport && x.count===5);
  const point = r => ({x:r.x+r.width/2-layout.arena.x,y:r.y+r.height/2-layout.arena.y});
  const rect = r => ({x:r.x-layout.arena.x,y:r.y-layout.arena.y,width:r.width,height:r.height});
  const exclusions = [rect(layout.resources), ...layout.monsters.slice(0,count).flatMap(m=>[rect(m.bars),{x:m.image.x-layout.arena.x,y:m.image.y+m.image.height+3-layout.arena.y,width:m.image.width,height:13}])];
  return { width:layout.arena.width, height:layout.arena.height, source:point(layout.player), targets:layout.monsters.slice(0,count).map(x=>point(x.image)), exclusions, layout };
}
let map, monster, player;
function base(viewport,count) {
  const g=geometry(viewport,count), canvas=createCanvas(g.width,g.height), ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(map,0,0,g.width,g.height);
  ctx.fillStyle='rgba(9,20,25,0.16)';ctx.fillRect(0,0,g.width,g.height);
  const offset = r => [r.x-g.layout.arena.x,r.y-g.layout.arena.y,r.width,r.height];
  ctx.font='bold 12px sans-serif';ctx.fillStyle='#f8fafc';ctx.fillText('PIXEL RPG · OFFLINE CANVAS',10,18);
  for(const [i,m] of g.layout.monsters.slice(0,count).entries()) {
    const r=m.image;ctx.drawImage(monster,...offset(r));
    const [x,y,w] = offset(m.bars);
    ctx.fillStyle='rgba(17,24,39,0.9)';ctx.fillRect(x,y,w,19);
    ctx.fillStyle='#3cb57b';ctx.fillRect(x+1,y+14,w-2,4);
    ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f1f5f9';ctx.fillText('42/42',x+w/2,y+10);
    ctx.fillStyle=i===2?'#ffe167':'#dbf5ff';ctx.fillText(`Target ${i+1}`,r.x+r.width/2-g.layout.arena.x,r.y+r.height+12-g.layout.arena.y);
  }
  const avatarRef=layouts.find(x=>x.width===320 && x.count===5).player;
  const [avatarX,avatarY,avatarW,avatarH]=offset(g.layout.player);
  ctx.save();ctx.beginPath();ctx.ellipse(avatarX+avatarW/2,avatarY+avatarH/2,avatarW/2,avatarH/2,0,0,Math.PI*2);ctx.clip();
  ctx.drawImage(player,avatarRef.x,avatarRef.y,avatarRef.width,avatarRef.height,avatarX,avatarY,avatarW,avatarH);ctx.restore();
  const [px,py,pw,ph]=offset(g.layout.resources);
  ctx.fillStyle='rgba(17,24,39,0.9)';ctx.fillRect(px,py,pw,ph);ctx.fillStyle='#ae4454';ctx.fillRect(px+1,py+1,pw-2,ph/2-2);ctx.fillStyle='#478dcb';ctx.fillRect(px+1,py+ph/2,pw-2,ph/2-1);
  ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('70/70',px+pw/2,py+ph/2-4);ctx.fillText('120/120',px+pw/2,py+ph-4);
  ctx.textAlign='left';return canvas;
}
function render(type,viewport,count,phase,reducedMotion=false, elapsedOverride, extraExclusions=[]) {
  const g=geometry(viewport,count), profile=EFFECT_PROFILES[type], timing=getEffectTiming(profile,undefined,reducedMotion);
  const at={cast:timing.castMs*0.55, travel:timing.castMs+(timing.hitMs-timing.castMs)*0.65, hit:timing.hitMs, tail:timing.hitMs+(timing.durationMs-timing.hitMs)*0.62, complete:timing.durationMs};
  const elapsed=elapsedOverride??at[phase];
  const overlay=createCanvas(g.width,g.height), stats={calls:0,balance:0};
  renderSkillEffect({ctx:checkedContext(overlay.getContext('2d'),stats),width:g.width,height:g.height,unit:Math.max(0.65,Math.min(1.35,Math.min(g.width,g.height)/420)),source:g.source,targets:g.targets,exclusions:[...g.exclusions,...extraExclusions],elapsed,timing,profile,type,seed:17,reducedMotion});
  if(stats.balance!==0) throw Error(`Unbalanced context ${stats.balance}`);
  const pixels=overlay.getContext('2d').getImageData(0,0,g.width,g.height).data;
  let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>5)visible++;
  for(const rect of [...g.exclusions,...extraExclusions].slice(0,14)) {
    if(![rect.x,rect.y,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)continue;
    for(let y=Math.max(0,Math.ceil(rect.y+1));y<Math.min(g.height,Math.floor(rect.y+rect.height-1));y++) for(let x=Math.max(0,Math.ceil(rect.x+1));x<Math.min(g.width,Math.floor(rect.x+rect.width-1));x++)if(pixels[(y*g.width+x)*4+3]!==0)throw Error(`HUD exclusion has visible overlay at ${x},${y}`);
  }
  if(phase==='hit' && !visible) throw Error('Blank impact for registered profile');
  const sha=crypto.createHash('sha256').update(pixels).digest('hex');
  const c=base(viewport,count);c.getContext('2d').drawImage(overlay,0,0);
  return {canvas:c,overlay,sha,stats,visible,elapsed,timing};
}
function save(canvas,name) {fs.writeFileSync(path.join(out,name),canvas.toBuffer('image/png'));}
function saveCloseup(canvas,name) {if(closeups)fs.writeFileSync(path.join(closeups,name),canvas.toBuffer('image/png'));}
function sheet(types, viewport,count,reducedMotion=false) {
  const size=geometry(viewport,count).width, phases=['cast','travel','hit','tail'];
  const rowHeight=size+36, w=size*4+24, h=rowHeight*types.length+58;
  const sheet=createCanvas(w,h),ctx=sheet.getContext('2d');ctx.fillStyle='#101827';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e5e7eb';ctx.font='bold 19px sans-serif';
  ctx.fillText(`OFFLINE Canvas · viewport ${viewport} · ${count} target${count>1?'s':''} · ${reducedMotion?'reduced motion':'full motion'}`,12,24);
  phases.forEach((p,i)=>{ctx.font='14px sans-serif';ctx.fillStyle='#9baec7';ctx.fillText(p.toUpperCase(),12+i*size,48);});
  types.forEach((type,row)=>phases.forEach((phase,col)=>{
    try {
      const r=render(type,viewport,count,phase,reducedMotion);
      ctx.drawImage(r.canvas,12+col*size,58+row*rowHeight);
      ctx.font='13px sans-serif';ctx.fillStyle='#e5e7eb';ctx.fillText(`${type} · ${Math.round(r.elapsed)}ms`,12+col*size,58+row*rowHeight+size+19);
      report.frames.push({type,viewport,count,phase,reducedMotion,elapsed:r.elapsed,calls:r.stats.calls,visiblePixels:r.visible,sha:r.sha});
      if(viewport===320 && count===5 && !reducedMotion) saveCloseup(r.canvas,`${type}-${phase}-mobile320.png`);
    } catch(e) {report.failures.push({type,viewport,count,phase,reducedMotion,error:String(e)});}
  }));
  const name=`${reducedMotion?'reduced-motion':'mage'}-${viewport}-${count}target${count>1?'s':''}.png`;save(sheet,name);return name;
}
(async()=>{
  [map,monster]=await Promise.all(['maps/pixel-map-11.png','monsters/pixel-monster-032.png'].map(p=>loadImage(path.join(root,'public/game/rpg/pixel-v1',p))));
  player=await loadImage(path.join(root,'output/combat-unit-layout/mobile-320.png'));
  report.sheets=[];
  for(const viewport of [320,640])for(const count of [1,5])report.sheets.push(sheet(mage,viewport,count));
  report.sheets.push(sheet(mage,320,5,true));
  const all=Object.keys(EFFECT_PROFILES), side=294, grid=createCanvas(side*4, (side+26)*Math.ceil(all.length/4)+36),gc=grid.getContext('2d');gc.fillStyle='#101827';gc.fillRect(0,0,grid.width,grid.height);gc.fillStyle='#f1f5f9';gc.font='17px sans-serif';gc.fillText(`${all.length} registered profiles · impact + 60ms · OFFLINE Canvas`,10,24);
  for(const [i,type] of all.entries()) {
    const timing=getEffectTiming(EFFECT_PROFILES[type]);
    const r=render(type,320,5,'hit',false,timing.hitMs+60);gc.drawImage(r.canvas,(i%4)*side,36+Math.floor(i/4)*(side+26));gc.fillStyle='#f1f5f9';gc.font='13px sans-serif';gc.fillText(type,(i%4)*side+8,36+Math.floor(i/4)*(side+26)+side+18);
    for(const count of [1,5])for(const reducedMotion of [false,true])for(const phase of ['cast','travel','hit','tail','complete']) {
      try {const a=render(type,320,count,phase,reducedMotion),b=render(type,320,count,phase,reducedMotion);if(a.sha!==b.sha)throw Error('nondeterministic pixels');if(phase==='complete'&&a.visible)throw Error('visible after complete');report.frames.push({type,viewport:320,count,phase,reducedMotion,calls:a.stats.calls,visiblePixels:a.visible,sha:a.sha,deterministic:true});}catch(e){report.failures.push({type,count,reducedMotion,phase,error:String(e)});}
    }
  }
  save(grid,`all-${all.length}-profiles-smoke.png`);report.sheets.push(`all-${all.length}-profiles-smoke.png`);
  const overviewHeight=100+Math.ceil(mage.length/3)*338;
  const overview=createCanvas(954,overviewHeight),oc=overview.getContext('2d');oc.fillStyle='#101827';oc.fillRect(0,0,954,overviewHeight);oc.fillStyle='#f8fafc';oc.font='bold 24px sans-serif';oc.fillText('Mage skill effects',20,34);oc.fillStyle='#adbfdb';oc.font='15px sans-serif';oc.fillText('OFFLINE Canvas preview · actual renderer · 320px layout · representative target counts',20,60);
  for(const [i,type] of mage.entries()) {
    const timing=getEffectTiming(EFFECT_PROFILES[type]);
    const useTravel=['fireball','ice-arrow','arcane-missile','element-cataclysm'].includes(type);
    const elapsed=useTravel ? timing.castMs+(timing.hitMs-timing.castMs)*0.72 : timing.hitMs+45;
    const targetCount=['fireball','ice-arrow','lightning','arcane-missile'].includes(type)?1:type==='chain-lightning'?3:5;
    const self=EFFECT_PROFILES[type].target==='self';
    const r=render(type,320,targetCount,useTravel?'travel':'hit',false,elapsed), x=20+((mage.length%3===1&&i===mage.length-1)?1:i%3)*312,y=82+Math.floor(i/3)*338;
    oc.drawImage(r.canvas,x,y);oc.fillStyle='#f1f5f9';oc.font='bold 15px sans-serif';oc.fillText(type,x,y+315);oc.font='12px sans-serif';oc.fillStyle='#9eb2ce';oc.fillText(`${useTravel?'travel':'impact'} · ${Math.round(elapsed)}ms · ${self?'self':targetCount+' target'+(targetCount>1?'s':'')}`,x,y+331);
  }
  save(overview,'mage-overview-offline.png');report.sheets.push('mage-overview-offline.png');
  for(const type of ['fireball','meteor']) { const t=getEffectTiming(EFFECT_PROFILES[type]);saveCloseup(render(type,320,5,'hit',false,t.hitMs+60).canvas,`${type}-impact60-mobile320.png`); }
  // Pixel-level regression check: overlapping exclusions stay clear in their intersection.
  for(const type of ['lightning','element-cataclysm','meteor']) {
    const timing=getEffectTiming(EFFECT_PROFILES[type]);
    try {render(type,320,1,'hit',false,timing.hitMs+40,[{x:20,y:95,width:40,height:35},{x:30,y:100,width:40,height:35}]);}catch(e){report.failures.push({type,check:'overlapping HUD pixel mask',error:String(e)});}
  }
  report.hudMaskChecks='Every rendered frame checks interior HUD pixels are exactly transparent; extra overlapping-hole cases tested for lightning, cataclysm, meteor';
  report.frameChecks=report.frames.length;report.maxDrawCalls=Math.max(...report.frames.map(f=>f.calls));
  fs.writeFileSync(path.join(out,'offline-render-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({mode:report.mode,profiles:report.profiles,frameChecks:report.frameChecks,maxDrawCalls:report.maxDrawCalls,failures:report.failures,sheets:report.sheets},null,2));
  process.exitCode=report.failures.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
