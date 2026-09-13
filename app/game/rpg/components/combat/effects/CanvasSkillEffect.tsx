'use client'

import { useEffect, useRef } from 'react'
import { EFFECT_PROFILES } from './effectRegistry'
import { createEffectTimeline, getEffectTiming } from './effectTimeline'
import { renderSkillEffect } from './renderSkillEffect'
import type { EffectFrame } from './effectDrawing'
import type { EffectAnchors, EffectPoint, SkillEffectProps } from './types'

const safePoint = (point: EffectPoint): EffectPoint => ({
  x: Number.isFinite(point.x) ? Math.max(0,Math.min(1,point.x)) : 0.5,
  y: Number.isFinite(point.y) ? Math.max(0,Math.min(1,point.y)) : 0.25,
})

/** One resize-aware canvas and clock for all casts; no React updates or frame-dependent physics. */
export function CanvasSkillEffect({ type, active, duration, sourcePosition, targetPosition, targetPositions, resolveAnchors, seed = 17, onHit, onComplete, className = '' }: SkillEffectProps) {
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const callbacks=useRef({onHit,onComplete})
  const positions=useRef({sourcePosition,targetPosition,targetPositions,resolveAnchors})
  useEffect(()=>{ callbacks.current={onHit,onComplete} },[onHit,onComplete])
  useEffect(()=>{ positions.current={sourcePosition,targetPosition,targetPositions,resolveAnchors} },[sourcePosition,targetPosition,targetPositions,resolveAnchors])

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!active||!canvas) return
    const ctx=canvas.getContext('2d')
    const profile=EFFECT_PROFILES[type]
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)')
    const timing=getEffectTiming(profile,duration,preference.matches)
    let cancelled=false, frameId=0, width=0, height=0, start: number | null=null
    let anchors: EffectAnchors={source:{x:0.5,y:0.85},targets:[{x:0.5,y:0.25}]}
    const timeline=createEffectTimeline(timing,()=>callbacks.current.onHit?.(),()=>callbacks.current.onComplete?.())
    const resize=()=>{
      const rect=canvas.getBoundingClientRect()
      width=rect.width; height=rect.height
      if(width<=0||height<=0||!ctx) return
      // Keep retina detail while bounding the canvas to two million physical pixels.
      const dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(2_000_000/(width*height)))
      canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr))
      ctx.setTransform(dpr,0,0,dpr,0,0)
      const p=positions.current
      const measured=p.resolveAnchors?.()
      anchors={source:safePoint(measured?.source??p.sourcePosition??{x:0.5,y:0.85}),targets:(measured?.targets.length?measured.targets:p.targetPositions?.length?p.targetPositions:[p.targetPosition??{x:0.5,y:0.25}]).slice(0,5).map(safePoint)}
    }
    const draw=(elapsed:number)=>{
      if(!ctx||width<=0||height<=0)return
      const pixel=(p:EffectPoint)=>({x:p.x*width,y:p.y*height})
      const frame:EffectFrame={ctx,width,height,unit:Math.max(0.65,Math.min(1.35,Math.min(width,height)/420)),source:pixel(anchors.source),targets:anchors.targets.map(pixel),elapsed,timing,profile,type,seed,reducedMotion:preference.matches}
      renderSkillEffect(frame)
    }
    const finish=()=>{
      if(cancelled)return
      draw(timing.durationMs)
      canvas.dataset.phase=timeline.advance(timing.durationMs)
      cancelAnimationFrame(frameId)
    }
    const tick=(now:number)=>{
      if(cancelled)return
      if(start==null) {resize();start=now}
      const elapsed=now-start
      draw(elapsed)
      canvas.dataset.phase=timeline.advance(elapsed)
      if(elapsed<timing.durationMs&&!cancelled)frameId=requestAnimationFrame(tick)
    }
    if(!ctx) {
      queueMicrotask(finish)
      return ()=>{cancelled=true;timeline.cancel()}
    }
    resize()
    const observer=new ResizeObserver(resize)
    observer.observe(canvas)
    // A background tab may stop RAF entirely. Settlement still completes, without replay on return.
    const watchdog=setTimeout(finish,timing.durationMs+180)
    const onMotionChange=()=>{if(preference.matches)finish()}
    preference.addEventListener('change',onMotionChange)
    frameId=requestAnimationFrame(tick)
    return ()=>{
      cancelled=true; timeline.cancel(); cancelAnimationFrame(frameId);clearTimeout(watchdog)
      observer.disconnect();preference.removeEventListener('change',onMotionChange)
      ctx.clearRect(0,0,width,height)
    }
  },[active,type,duration,seed])

  if(!active)return null
  return <canvas ref={canvasRef} aria-hidden="true" data-skill-effect={type} className={`pointer-events-none block h-full w-full ${className}`} />
}
