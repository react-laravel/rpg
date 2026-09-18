import Image, { type ImageProps } from 'next/image'

/** 像素资源直接使用原生 PNG，避免图片优化器重新采样后变糊。 */
export default function GameImage({ src, alt, style, unoptimized, ...props }: ImageProps) {
  const pixel = typeof src === 'string' && src.includes('/game/rpg/pixel-v1/')
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={pixel || unoptimized}
      style={pixel ? { ...style, imageRendering: 'pixelated' } : style}
    />
  )
}
