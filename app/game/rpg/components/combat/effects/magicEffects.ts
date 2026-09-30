import { detailCount, elementalGlyph, elementalImpact, elementalProjectile, polygon, snowflake } from './elementalDrawing'
import { bolt, burst, clamp01, easeOut, glow, line, noise, pointBetween, rgba, ring, shard, shieldGlyph, TAU, type EffectFrame } from './effectDrawing'

export function drawMagicEffect(f: EffectFrame) {
  const { ctx, elapsed: ms, timing, profile, unit: u, source, targets, type } = f
  const flight = (ms - timing.castMs) / (timing.hitMs - timing.castMs)
  const age = ms - timing.hitMs
  const tail = 1 - clamp01(age / (timing.durationMs - timing.hitMs))

  if (profile.family === 'fire' || profile.family === 'ice' || profile.family === 'arcane') {
    const shape = profile.family === 'fire' ? 'flame' : profile.family === 'ice' ? 'crystal' : 'missile'
    for (const target of targets) {
      const count = profile.family === 'arcane' ? 3 : 1
      for (let i = 0; i < count; i++) {
        const p = (flight - i * 0.12) / (1 - i * 0.12)
        // All three missiles arrive on the authoritative hit, despite separate launch times.
        elementalProjectile(f, source, target, p, (i - (count - 1) / 2) * 58 * u, shape, count > 1 ? 0.8 : 1)
      }
      elementalImpact(f, target, age, shape)
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
        const flash = Math.max(0, 1 - age / 150)
        glow(ctx, target, 25 * u, profile.highlight, flash * 0.55)
        // A sharp star and short ground arcs distinguish electricity from an explosion.
        for (let ray = 0; ray < 4; ray++) {
          const angle = ray / 4 * TAU + Math.PI / 4
          shard(ctx, target, (15 + flash * 19) * u, angle, profile.highlight, flash * 0.8)
        }
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
          elementalProjectile(f, start, end, p * p, 0, 'flame', count > 1 ? 1.25 : 1.7)
          const rock = pointBetween(start, end, p * p)
          ctx.save()
          ctx.globalCompositeOperation = 'source-over'
          const r = (count > 1 ? 10 : 15) * u
          const corners = Array.from({ length: 6 }, (_, index) => ({ x: rock.x + Math.cos(index / 6 * TAU + 0.3) * r, y: rock.y + Math.sin(index / 6 * TAU + 0.3) * r }))
          polygon(f, corners, '#653324', 1)
          polygon(f, [corners[0], corners[1], rock, corners[5]], '#a85a32', 1)
          line(ctx, [corners[2], rock, corners[4]], profile.highlight, 0.9, 1.5 * u)
          ctx.restore()
        }
      }
      if (age >= 0) {
        const expansion = easeOut(age / 500)
        const flash = Math.max(0, 1 - age / 180)
        glow(ctx, target, 38 * u, profile.color, flash * 0.7)
        // A brief upward blast reads immediately, before the heavier debris has spread.
        for (let ray = 0; ray < 5; ray++) {
          shard(ctx, target, (18 + noise(ray, f.seed) * 10) * u, -Math.PI + ray / 4 * Math.PI, profile.color, flash * 0.85)
        }
        glow(ctx, target, 10 * u, profile.highlight, flash)
        ring(ctx, { x: target.x, y: target.y + 18 * u }, (12 + expansion * 48) * u, profile.highlight, tail * tail * 0.7, 2 * u, 0.3)
        burst(f, target, age, { count: detailCount(f, 12), radius: 52, ice: true })
      }
      if (age >= 0) {
        for (let i = 0; i < detailCount(f, 7); i++) {
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
        snowflake(f, target, (18 + easeOut(age / 350) * 18) * u, tail * tail * 0.8)
        burst(f, target, age, { ice: true, count: detailCount(f, 10), radius: 48 })
      }
      const crystals = detailCount(f, 7)
      for (let i = 0; i < crystals; i++) {
        const angle = i / crystals * TAU
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

  if (profile.family === 'summon') {
    const companion = f.companion ?? source
    const appear = age < 0 ? easeOut(ms / timing.hitMs) : tail
    const ground = { x: companion.x, y: companion.y + 23 * u }
    ring(ctx, ground, (20 + appear * 13) * u, profile.highlight, appear * 0.8, 1.5 * u, 0.35)
    ring(ctx, ground, (26 + appear * 13) * u, profile.color, appear * 0.6, u, 0.35)
    glow(ctx, companion, 35 * u, profile.color, appear * 0.35)
    elementalGlyph(f, companion, 12 * u, appear * 0.8)
    if (f.companion && flight >= 0 && age < 0) {
      const end = pointBetween(source, companion, clamp01(flight), -16 * u)
      line(ctx, [source, end], profile.color, 0.5, 1.4 * u)
      glow(ctx, end, 9 * u, profile.highlight, 0.7)
    }
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * TAU
      const rise = easeOut(clamp01(ms / timing.durationMs))
      const p = { x: companion.x + Math.cos(angle) * 29 * u, y: companion.y + Math.sin(angle) * 12 * u + 12 * u - rise * 32 * u }
      shard(ctx, p, (3 + i % 2) * u, -Math.PI / 2, i % 2 ? profile.highlight : profile.color, appear * 0.75)
    }
    return
  }

  if (profile.family === 'heal' || profile.family === 'shield' || profile.family === 'aura') {
    const p = source
    const appear = age < 0 ? easeOut(ms / timing.hitMs) : tail
    const radius = 39 * u
    glow(ctx,p,radius*1.7,profile.color,appear*0.55)
    ring(ctx,{x:p.x,y:p.y+25*u},radius*(0.7+0.3*appear),profile.highlight,appear*0.8,1.6*u,0.34)
    if (profile.family === 'shield') {
      shieldGlyph(f,p,radius * 0.62,appear)
      ring(ctx,p,radius,profile.highlight,appear * 0.65,1.4*u,1.12,-Math.PI * 0.95,Math.PI * 0.95)
      const facets = Array.from({ length: 6 }, (_, i) => ({ x: p.x + Math.cos(i / 6 * TAU) * radius, y: p.y + Math.sin(i / 6 * TAU) * radius }))
      line(ctx,[...facets,facets[0]],profile.color,appear * 0.42,u)
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
        elementalProjectile(variant,source,target,flight,(i-1)*58*u,i === 0 ? 'flame' : i === 1 ? 'crystal' : 'missile',0.8)
        if(age>=0) {
          ring(ctx,target,(16+easeOut(age/650)*38+i*6)*u,color,tail*tail*0.5,1.5*u,0.5,i * TAU/3 + age/900,i * TAU/3 + age/900 + 1.8)
          burst(variant,target,age,{color,count:detailCount(f, 8),ice:i===1,radius:48})
        }
      })
      if(age>=0) {
        glow(ctx,target,25*u,profile.highlight,Math.max(0,1-age/180)*0.6)
        bolt(f,{x:target.x,y:target.y-100*u},target,1,tail*0.7)
      }
    })
  }
}
