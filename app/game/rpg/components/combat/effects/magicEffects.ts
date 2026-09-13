import { bolt, burst, clamp01, easeOut, glow, impact, line, mix, noise, pointBetween, projectile, rgba, ring, shard, shieldGlyph, TAU, type EffectFrame } from './effectDrawing'

export function drawMagicEffect(f: EffectFrame) {
  const { ctx, elapsed: ms, timing, profile, unit: u, source, targets, type } = f
  const flight = (ms - timing.castMs) / (timing.hitMs - timing.castMs)
  const age = ms - timing.hitMs
  const tail = 1 - clamp01(age / (timing.durationMs - timing.hitMs))

  if (profile.family === 'fire' || profile.family === 'ice' || profile.family === 'arcane') {
    for (const target of targets) {
      const count = profile.family === 'arcane' ? 3 : 1
      for (let i = 0; i < count; i++) {
        const p = (flight - i * 0.12) / (1 - i * 0.12)
        projectile(f, source, target, p, (i - (count - 1) / 2) * 70 * u, profile.family === 'ice' ? 'ice' : 'orb', count > 1 ? 0.72 : 1)
      }
      impact(f, target, age)
      if (profile.family === 'ice') burst(f, target, age, { ice: true, count: 14, radius: 80 })
      if (profile.family === 'fire' && age >= 0) {
        for (let i = 0; i < 7; i++) {
          const x = target.x + (noise(i, f.seed) - 0.5) * 60 * u
          const y = target.y - easeOut(clamp01(age / 600)) * (20 + noise(i + 20, f.seed) * 60) * u
          glow(ctx, {x, y}, (12 + noise(i + 3, f.seed) * 15) * u * tail, i % 2 ? profile.highlight : profile.color, tail * 0.45)
        }
      }
    }
    return
  }

  if (profile.family === 'lightning') {
    const chain = type === 'chain-lightning'
    targets.forEach((target, index) => {
      const start = chain ? (index === 0 ? source : targets[index - 1]) : { x: target.x - 20 * u, y: Math.max(8, target.y - 180 * u) }
      const p = chain ? clamp01(flight * targets.length - index) : clamp01(flight)
      if (flight >= 0 && p > 0) bolt(f, start, target, p, age < 0 ? 0.82 : tail ** 2, index * 19)
      if (age >= 0) {
        // Small local after-arcs; no whole-screen flash or random frame-to-frame flicker.
        for (let branch = 0; branch < 3; branch++) {
          const angle = (branch / 3) * TAU + index
          bolt(f, target, { x: target.x + Math.cos(angle) * 44 * u, y: target.y + Math.sin(angle) * 28 * u }, 1, tail * 0.45, branch * 7)
        }
        impact(f, target, age, type === 'thunder-wrath' ? 1.4 : 0.8)
      }
    })
    return
  }

  if (profile.family === 'meteor') {
    targets.forEach((target, index) => {
      const count = type === 'meteor-storm' ? 3 : 1
      ring(ctx, target, (25 + Math.min(1, flight) * 10) * u, profile.color, age < 0 ? 0.5 : tail * 0.2, u, 0.4)
      for (let i = 0; i < count; i++) {
        const p = (flight - i * 0.08) / (1 - i * 0.08)
        const end = { x: target.x + (i - (count - 1) / 2) * 16 * u, y: target.y }
        const start = { x: end.x - 100 * u, y: -45 * u }
        if (p >= 0 && p < 1) {
          projectile(f, start, end, p * p, 0, 'orb', count > 1 ? 1 : 1.5)
          const rock = pointBetween(start, end, p * p)
          shard(ctx, rock, 18 * u, 0.8, '#6f3022', 1)
          shard(ctx, rock, 11 * u, 0.4, profile.highlight, 0.8)
        }
      }
      impact(f, target, age, 1.5)
      if (age >= 0) {
        for (let i = 0; i < 7; i++) {
          const angle = noise(i + index * 10, f.seed) * TAU
          const d = 70 * u * easeOut(age / 500)
          line(ctx, [target, { x: target.x + Math.cos(angle) * d * 0.4, y: target.y + Math.sin(angle) * d * 0.15 }, { x: target.x + Math.cos(angle) * d, y: target.y + Math.sin(angle) * d * 0.4 }], profile.color, tail * 0.65, 1.6 * u)
        }
      }
    })
    return
  }

  if (profile.family === 'frost') {
    const center = { x: targets.reduce((n,p)=>n+p.x,0)/targets.length, y: targets.reduce((n,p)=>n+p.y,0)/targets.length }
    const spread = Math.max(...targets.map(p=>Math.abs(p.x-center.x))) + 48 * u
    const expansion = easeOut(clamp01(flight))
    ring(ctx, center, Math.max(1, spread * expansion), profile.highlight, age < 0 ? 0.8 : tail * 0.65, 2.3 * u, 0.38)
    glow(ctx, center, spread * 0.8, profile.color, age < 0 ? expansion * 0.22 : tail * 0.2)
    for (const target of targets) {
      if (age >= 0) {
        impact(f, target, age, 0.85)
        burst(f, target, age, { ice: true, count: 15 })
      }
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * TAU
        const d = (18 + noise(i,f.seed)*16) * u * expansion
        const p = { x: target.x + Math.cos(angle) * d, y: target.y + Math.sin(angle) * d * 0.45 + 12 * u }
        shard(ctx, p, (12 + noise(i + 8,f.seed) * 20) * u * expansion, -Math.PI/2 + (i-3)*0.1, i%2 ? profile.color : profile.highlight, age < 0 ? expansion * 0.5 : tail * 0.75)
      }
    }
    return
  }

  if (profile.family === 'void') {
    const center = targets[Math.floor(targets.length / 2)]
    const growth = age < 0 ? easeOut(flight) : tail
    const radius = (type === 'blackhole' ? 66 : 44) * u * growth
    glow(ctx, center, radius * 1.65, profile.color, growth * 0.65)
    ctx.fillStyle = rgba('#100b21', growth * 0.92); ctx.beginPath(); ctx.ellipse(center.x,center.y,radius * 0.7,radius * 0.3,-0.25,0,TAU); ctx.fill()
    for (let i=0;i<6;i++) ring(ctx,center,radius*(0.7+i*0.08),i%2?profile.highlight:profile.color,growth*0.65,1.8*u,0.4,ms/370+i,ms/370+i+2)
    targets.forEach(target=>{ if(age>=0) burst(f,target,age,{color:profile.color,count:10,radius:44}) })
    return
  }

  if (profile.family === 'heal' || profile.family === 'shield' || profile.family === 'aura') {
    const p = source
    const appear = age < 0 ? easeOut(ms / timing.hitMs) : tail
    const radius = 39 * u
    glow(ctx,p,radius*1.7,profile.color,appear*0.55)
    ring(ctx,{x:p.x,y:p.y+25*u},radius*(0.7+0.3*appear),profile.highlight,appear*0.8,1.6*u,0.34)
    if (profile.family === 'shield') {
      shieldGlyph(f,p,radius,appear)
      ring(ctx,p,radius*1.1,profile.color,appear*0.6,2*u,1,-Math.PI*0.9,Math.PI*0.15)
      for (let i=0;i<6;i++) {
        const a=i/6*TAU
        shard(ctx,{x:p.x+Math.cos(a)*radius,y:p.y+Math.sin(a)*radius},4*u,a,profile.highlight,appear)
      }
    } else if (profile.family === 'heal') {
      for(let i=0;i<12;i++) {
        const t=(ms / 1200 + noise(i,f.seed)) % 1
        const pos={x:p.x+(noise(i+20,f.seed)-0.5)*75*u,y:p.y+30*u-t*85*u}
        const alpha=Math.sin(t*Math.PI)*appear
        const size=(2+noise(i+40,f.seed)*3)*u
        line(ctx,[{x:pos.x-size,y:pos.y},{x:pos.x+size,y:pos.y}],profile.highlight,alpha,1.4*u)
        line(ctx,[{x:pos.x,y:pos.y-size},{x:pos.x,y:pos.y+size}],profile.highlight,alpha,1.4*u)
      }
    } else {
      for(let i=0;i<3;i++) {
        const t=clamp01((ms-i*100)/timing.durationMs)
        ring(ctx,p,(26+easeOut(t)*58)*u,profile.color,(1-t)*appear*0.55,2.8*u,0.8)
      }
      if(type==='rage') for(let i=0;i<9;i++) shard(ctx,{x:p.x+(i-4)*9*u,y:p.y+18*u-Math.sin(i+ms/250)*8*u},(14+noise(i)*16)*u*appear,-Math.PI/2,profile.color,appear*0.55)
    }
    return
  }

  if (profile.family === 'cataclysm') {
    const colors=['#ff913e','#80e5ff','#c79aff']
    targets.forEach(target=>{
      colors.forEach((color,i)=>{
        const variant={...f,profile:{...profile,color,highlight:i===1?'#edfeff':'#fff0df'}}
        projectile(variant,source,target,flight,(i-1)*68*u,'orb',0.82)
        if(age>=0) {
          ring(ctx,target,(20+easeOut(age/650)*70+i*8)*u,color,tail*0.65,2*u,0.5)
          burst(variant,target,age,{color,count:10,ice:i===1,radius:85})
        }
      })
      if(age>=0) {
        glow(ctx,target,35*u,profile.highlight,Math.max(0,1-age/180))
        bolt(f,{x:target.x,y:target.y-100*u},target,1,tail*0.7)
      }
    })
  }
}
