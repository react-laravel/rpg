import { burst, clamp01, easeOut, glow, impact, line, noise, pointBetween, projectile, rgba, ring, shard, shieldGlyph, TAU, type EffectFrame } from './effectDrawing'

export function drawPhysicalEffect(f: EffectFrame) {
  const {ctx, elapsed:ms, timing, profile, source, targets, unit:u, type} = f
  const flight=(ms-timing.castMs)/(timing.hitMs-timing.castMs)
  const age=ms-timing.hitMs
  const tail=1-clamp01(age/(timing.durationMs-timing.hitMs))

  if(profile.family==='arrow') {
    targets.forEach((target,index)=>{
      const count=type==='arrow-rain'?4:type==='multi-shot'&&targets.length===1?3:1
      for(let i=0;i<count;i++) {
        const p=(flight-i*0.08)/(1-i*0.08)
        const start=type==='arrow-rain'
          ? {x:target.x-55*u+(i-1.5)*14*u,y:-35*u-i*8*u}:source
        projectile(f,start,target,p,type==='multi-shot'?(i-(count-1)/2)*65*u:0,'arrow',0.85)
      }
      impact(f,target,age,0.7)
      if(type==='poison'&&age>=0) {
        for(let i=0;i<7;i++) {
          const p={x:target.x+(noise(i+index*10,f.seed)-0.5)*55*u,y:target.y+12*u-easeOut(age/700)*(12+noise(i+8,f.seed)*35)*u}
          glow(ctx,p,12*u*tail,profile.color,tail*0.32)
          ring(ctx,p,3*u,profile.highlight,tail*0.65,0.7*u)
        }
      }
    })
    return
  }

  if(profile.family==='slash'||profile.family==='whirlwind') {
    const sweeping=clamp01((ms-timing.castMs)/(timing.hitMs-timing.castMs+110))
    targets.forEach(target=>{
      const r=(type==='execute'?52:40)*u
      const strokes=profile.family==='whirlwind'?3:type==='execute'?2:1
      for(let i=0;i<strokes;i++) {
        const angle=type==='execute'?i*Math.PI/2:-0.7+i*TAU/3
        ctx.save(); ctx.translate(target.x,target.y); ctx.rotate(angle)
        const start=-Math.PI*0.95+ (profile.family==='whirlwind'?ms/200:0)
        const end=start+Math.PI*1.3*sweeping
        ring(ctx,{x:0,y:0},r+i*6*u,profile.color,age<0?sweeping*0.8:tail*0.5,9*u,0.55,start,end)
        ring(ctx,{x:0,y:0},r+i*6*u,profile.highlight,age<0?sweeping:tail,2.3*u,0.55,start,end)
        if(age>=0) line(ctx,[{x:-r*0.65,y:r*0.2},{x:r*0.65,y:-r*0.2}],profile.highlight,tail*0.8,2*u)
        ctx.restore()
      }
      impact(f,target,age,type==='execute'?1.05:0.7)
    })
    return
  }

  if(profile.family==='charge'||profile.family==='slam') {
    targets.forEach(target=>{
      const isTitan=type==='titan-fall'
      const start=isTitan?{x:target.x,y:Math.max(20,target.y-160*u)}:source
      const p=clamp01(flight*flight)
      if(flight>=0&&age<0) {
        for(let i=5;i>=0;i--) {
          const ghost=pointBetween(start,target,Math.max(0,p-i*0.035))
          shieldGlyph(f,ghost,(isTitan?34:19)*u,(1-i/6)*0.72)
        }
        glow(ctx,pointBetween(start,target,p),40*u,profile.color,0.7)
      }
      impact(f,target,age,isTitan?1.8:1.15)
      if(age>=0) {
        const r=easeOut(age/500)*(isTitan?90:55)*u
        ring(ctx,target,r,profile.highlight,tail*0.6,3*u,0.4)
        for(let i=0;i<8;i++) {
          const a=i/8*TAU, d=r*(0.5+noise(i,f.seed)*0.5)
          line(ctx,[target,{x:target.x+Math.cos(a)*d*0.6,y:target.y+Math.sin(a)*d*0.16},{x:target.x+Math.cos(a)*d,y:target.y+Math.sin(a)*d*0.38}],profile.color,tail*0.55,1.7*u)
        }
      }
    })
    return
  }

  if(profile.family==='wind') {
    const intensity=age<0?easeOut(ms/timing.hitMs):tail
    for(let i=0;i<5;i++) {
      const center={x:source.x+(i-2)*9*u,y:source.y+(i-2)*6*u}
      ring(ctx,center,(25+i*6)*u,profile.color,intensity*0.65,1.5*u,0.6,-ms/250+i,-ms/250+i+Math.PI*1.4)
    }
    burst(f,source,age,{count:12,radius:70})
    return
  }

  if(profile.family==='shadow') {
    const fade=age<0?easeOut(flight):tail
    ring(ctx,source,35*u,profile.color,fade*0.7,3*u,0.5,0,Math.PI*1.6)
    targets.forEach(target=>{
      if(flight>=0&&age<0) {
        for(let i=0;i<7;i++) {
          const p=pointBetween(source,target,clamp01(flight-i*0.05),30*u)
          glow(ctx,p,22*u,profile.color,(1-i/7)*0.4)
        }
      }
      glow(ctx,target,46*u,profile.color,fade*0.4)
      ring(ctx,target,35*u,profile.highlight,fade*0.75,1.6*u,0.55,ms/220,ms/220+Math.PI*1.5)
      if(age>=0) {
        line(ctx,[{x:target.x-22*u,y:target.y+18*u},{x:target.x+22*u,y:target.y-18*u}],profile.highlight,tail,3*u)
        impact(f,target,age,0.7)
      }
    })
    return
  }

  if(profile.family==='trap'||profile.family==='mark') {
    targets.forEach(target=>{
      const unfold=easeOut(flight), opacity=age<0?unfold*0.65:tail
      const r=34*u*(0.6+0.4*unfold)
      if(profile.family==='trap') {
        ctx.save(); ctx.translate(target.x,target.y+10*u); ctx.scale(1,0.65)
        ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r,0); ctx.lineTo(0,r); ctx.lineTo(-r,0); ctx.closePath()
        ctx.fillStyle=rgba(profile.color,opacity*0.08);ctx.fill()
        ctx.strokeStyle=rgba(profile.highlight,opacity);ctx.lineWidth=1.6*u;ctx.stroke()
        for(let i=-2;i<=2;i++) {
          const x=i*r/3, y=r-Math.abs(x)
          line(ctx,[{x,y:-y},{x,y}],profile.color,opacity,1*u)
          line(ctx,[{x:-y,y:x},{x:y,y:x}],profile.color,opacity,1*u)
        }
        ctx.restore()
      } else {
        ring(ctx,target,r,profile.color,opacity,1.2*u)
        for(let i=0;i<4;i++) {
          const a=i/4*TAU
          const outer={x:target.x+Math.cos(a)*r*1.25,y:target.y+Math.sin(a)*r*1.25}
          const inner={x:target.x+Math.cos(a)*r*0.85,y:target.y+Math.sin(a)*r*0.85}
          line(ctx,[outer,inner],profile.highlight,opacity,2.4*u)
        }
        shard(ctx,{x:target.x,y:target.y-r-10*u},8*u,Math.PI/2,profile.highlight,opacity)
      }
      if(age>=0) impact(f,target,age,0.6)
    })
  }
}
