'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'

const PRESET_EFFECTS = [
  { id: 0, name: 'rainbow', label: 'Rainbow' },
  { id: 1, name: 'wave', label: 'Wave' },
  { id: 2, name: 'shake', label: 'Shake' },
  { id: 3, name: 'pulse', label: 'Pulse' },
]

// Effect rendering functions (matching ShaderPreview)
const EFFECT_RENDERS: Record<number, (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, i: number, time: number, speed: number, param: number, color: string, total: number) => void> = {
  0: (ctx, char, x, y, i, time, speed) => { // Rainbow
    const hue = ((i * 0.03 + time * speed * 0.03) % 1) * 360
    ctx.fillStyle = `hsl(${hue}, 90%, 60%)`
    ctx.fillText(char, x, y)
  },
  1: (ctx, char, x, y, i, time, speed, param, color) => { // Wave
    const phase = i * 0.6 + time * speed * 2.0
    const offsetY = Math.sin(phase) * Math.max(1, param) * 1
    ctx.fillStyle = color
    ctx.fillText(char, x, y + offsetY)
  },
  2: (ctx, char, x, y, i, time, speed, param, color) => { // Shake
    const seed = i + Math.floor(time * speed * 8.0)
    const amp = Math.max(1, param) * 1
    const randX = (Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1 - 0.5) * amp
    const randY = (Math.abs(Math.sin(seed * 78.233) * 43758.5453) % 1 - 0.5) * amp
    ctx.fillStyle = color
    ctx.fillText(char, x + randX, y + randY)
  },
  3: (ctx, char, x, y, i, time, speed, param, color) => { // Pulse
    const pulse = (Math.sin(time * speed * 0.5 + i * 0.3) + 1) * 0.5
    ctx.globalAlpha = 0.3 + pulse * 0.7
    ctx.fillStyle = color
    ctx.fillText(char, x, y)
    ctx.globalAlpha = 1
  },
}

// Alpha LSB encoding (matching AlphaLsbEncoding.java)
const LSB_BITS = 4
const LOW_MASK = (1 << LSB_BITS) - 1
const DATA_MASK = (1 << (LSB_BITS - 1)) - 1
const DATA_MIN = 1
const DATA_GAP = 5

function encodeNibble(data: number): number {
  let encoded = (data & DATA_MASK) + DATA_MIN
  if (DATA_GAP >= 0 && encoded >= DATA_GAP) encoded += 1
  return encoded
}

function encodeChannel(base: number, data: number): number {
  return (base & ~LOW_MASK) | encodeNibble(data)
}

function avoidAnimationSentinels(red: number): number {
  if (red === 254) return red - 16
  if (red >= 62 && red <= 64) return red + 16
  return red
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function encodeTextEffect(baseColor: { r: number; g: number; b: number }, effectId: number, speed: number, param: number) {
  const rEnc = avoidAnimationSentinels(encodeChannel(baseColor.r, effectId & DATA_MASK))
  const gEnc = encodeChannel(baseColor.g, clamp(speed, 1, DATA_MASK))
  const bEnc = encodeChannel(baseColor.b, clamp(param, 0, DATA_MASK))
  const hex = `#${rEnc.toString(16).padStart(2, '0')}${gEnc.toString(16).padStart(2, '0')}${bEnc.toString(16).padStart(2, '0')}`
  return { r: rEnc, g: gEnc, b: bEnc, hex: hex.toUpperCase() }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 }
}

export default function TextEffectGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  const [useCustomId, setUseCustomId] = useState(false)
  const [effectId, setEffectId] = useState(0)
  const [speed, setSpeed] = useState(3)
  const [param, setParam] = useState(3)
  const [baseColorHex, setBaseColorHex] = useState('#FFFFFF')
  const [sampleText, setSampleText] = useState('Hello World!')
  const [copied, setCopied] = useState<string | null>(null)
  const [fontLoaded, setFontLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const baseColor = useMemo(() => hexToRgb(baseColorHex), [baseColorHex])
  const presetEffect = PRESET_EFFECTS.find((e) => e.id === effectId)
  const effectName = presetEffect?.name ?? `custom_${effectId}`
  const encodedColor = useMemo(() => encodeTextEffect(baseColor, effectId, speed, param), [baseColor, effectId, speed, param])
  const miniMessage = `<${encodedColor.hex}>${sampleText}`

  // Load font
  useEffect(() => {
    const font = new FontFace('Minecraft', 'url(/fonts/Minecraft-Seven_v2.woff2)')
    font.load().then((f) => { document.fonts.add(f); setFontLoaded(true) }).catch(() => setFontLoaded(true))
  }, [])

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [isFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Render preview
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = (Date.now() - startTimeRef.current) / 1000
    const fontSize = isFullscreen ? 48 : 20
    ctx.font = `${fontSize}px Minecraft, monospace`

    const chars = sampleText.split('')
    const charWidths = chars.map(c => ctx.measureText(c).width)
    const totalWidth = charWidths.reduce((a, b) => a + b, 0)
    const padding = 12

    canvas.width = isFullscreen ? window.innerWidth : Math.max(180, totalWidth + padding * 2)
    canvas.height = isFullscreen ? 150 : fontSize * 1.6 + padding * 2

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.font = `${fontSize}px Minecraft, monospace`
    ctx.textBaseline = 'middle'
    ctx.imageSmoothingEnabled = false

    const startX = isFullscreen ? (canvas.width - totalWidth) / 2 : padding
    let x = startX
    const y = canvas.height / 2
    const renderFn = EFFECT_RENDERS[effectId] || EFFECT_RENDERS[0]

    for (let i = 0; i < chars.length; i++) {
      renderFn(ctx, chars[i], x, y, i, time, speed, param, baseColorHex, chars.length)
      x += charWidths[i]
    }

    animationRef.current = requestAnimationFrame(render)
  }, [effectId, speed, param, baseColorHex, sampleText, isFullscreen])

  useEffect(() => {
    if (!fontLoaded) return
    animationRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationRef.current)
  }, [fontLoaded, render])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div
      ref={containerRef}
      style={{
        border: '2px solid var(--nextra-primary)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginTop: '24px',
        marginBottom: '24px',
        backgroundColor: isFullscreen ? '#1a1a2e' : 'var(--nextra-bg)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        ...(isFullscreen ? {
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          margin: 0,
          borderRadius: 0,
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
        } : {}),
      }}
    >
      {/* Header with effect selector */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--nextra-border)',
        background: 'linear-gradient(to right, var(--nextra-primary-alpha), transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎨</span> Color Code Generator
          </span>
        </div>
        <button
          onClick={toggleFullscreen}
          style={{
            padding: '4px 10px',
            borderRadius: '4px',
            border: '1px solid var(--nextra-border)',
            backgroundColor: isFullscreen ? 'var(--nextra-primary-alpha)' : 'transparent',
            color: 'var(--nextra-fg)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
        >
          {isFullscreen ? '⤓ Exit' : '⤢ Fullscreen'}
        </button>
      </div>

      {/* Effect selector */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--nextra-border)',
        backgroundColor: 'var(--nextra-code-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>Effect:</span>
          {!useCustomId ? (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {PRESET_EFFECTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEffectId(e.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: effectId === e.id ? '2px solid var(--nextra-primary)' : '1px solid var(--nextra-border)',
                    backgroundColor: effectId === e.id ? 'var(--nextra-primary-alpha)' : 'transparent',
                    color: 'var(--nextra-fg)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: effectId === e.id ? 600 : 400,
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="number"
              min="0"
              max="7"
              value={effectId}
              onChange={(e) => setEffectId(clamp(parseInt(e.target.value) || 0, 0, 7))}
              style={{
                width: '50px',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--nextra-border)',
                backgroundColor: 'var(--nextra-bg)',
                color: 'var(--nextra-fg)',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginLeft: 'auto', cursor: 'pointer' }}>
            <input type="checkbox" checked={useCustomId} onChange={(e) => setUseCustomId(e.target.checked)} />
            Custom ID
          </label>
        </div>
      </div>

      {/* Preview + Controls row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', flex: isFullscreen ? 1 : undefined }}>
        {/* Preview */}
        <div style={{
          flex: isFullscreen ? 1 : '1 1 200px',
          padding: isFullscreen ? '32px' : '14px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1a1a2e',
          minHeight: isFullscreen ? undefined : '70px',
        }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', imageRendering: 'pixelated' }} />
        </div>

        {/* Output */}
        {!isFullscreen && (
          <div style={{
            flex: '1 1 200px',
            padding: '12px 14px',
            borderLeft: '1px solid var(--nextra-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: encodedColor.hex,
                  borderRadius: '6px',
                  border: '2px solid var(--nextra-border)',
                  cursor: 'pointer',
                }}
                onClick={() => copyToClipboard(encodedColor.hex, 'hex')}
                title="Click to copy hex"
              />
              <div>
                <div
                  style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => copyToClipboard(encodedColor.hex, 'hex')}
                >
                  {encodedColor.hex}
                  {copied === 'hex' && <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--nextra-primary)' }}>✓ copied!</span>}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.5 }}>
                  RGB({encodedColor.r}, {encodedColor.g}, {encodedColor.b})
                </div>
              </div>
            </div>
            <div
              onClick={() => copyToClipboard(miniMessage, 'mini')}
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--nextra-code-bg)',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '11px',
                cursor: 'pointer',
                wordBreak: 'break-all',
                border: '1px solid var(--nextra-border)',
              }}
              title="Click to copy MiniMessage"
            >
              {miniMessage}
              {copied === 'mini' && <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--nextra-primary)' }}>✓ copied!</span>}
            </div>
          </div>
        )}
      </div>

      {/* Compact controls */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--nextra-border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px',
        fontSize: '11px',
        backgroundColor: 'var(--nextra-bg)',
      }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, opacity: 0.6, marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px' }}>Text</label>
          <input
            type="text"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'var(--nextra-bg)',
              color: 'var(--nextra-fg)',
              fontSize: '11px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, opacity: 0.6, marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px' }}>Speed ({speed})</label>
          <input type="range" min="1" max="7" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, opacity: 0.6, marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px' }}>Param ({param})</label>
          <input type="range" min="0" max="7" value={param} onChange={(e) => setParam(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, opacity: 0.6, marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px' }}>Base Color</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="color"
              value={baseColorHex}
              onChange={(e) => setBaseColorHex(e.target.value)}
              style={{ width: '28px', height: '24px', padding: 0, border: '1px solid var(--nextra-border)', borderRadius: '3px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={baseColorHex}
              onChange={(e) => setBaseColorHex(e.target.value)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '3px', border: '1px solid var(--nextra-border)', backgroundColor: 'var(--nextra-bg)', color: 'var(--nextra-fg)', fontSize: '10px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

      {/* Encoding info (collapsed by default) */}
      {!isFullscreen && (
        <details style={{ borderTop: '1px solid var(--nextra-border)' }}>
          <summary style={{
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 600,
            opacity: 0.5,
            backgroundColor: 'var(--nextra-code-bg)',
          }}>
            Encoding Details
          </summary>
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--nextra-code-bg)',
            fontSize: '10px',
            fontFamily: 'monospace',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '2px 12px',
          }}>
            <span style={{ opacity: 0.5 }}>Effect:</span><span>{effectName} (ID: {effectId})</span>
            <span style={{ opacity: 0.5 }}>R channel:</span><span>{baseColor.r} → {encodedColor.r}</span>
            <span style={{ opacity: 0.5 }}>G channel:</span><span>{baseColor.g} → {encodedColor.g}</span>
            <span style={{ opacity: 0.5 }}>B channel:</span><span>{baseColor.b} → {encodedColor.b}</span>
          </div>
        </details>
      )}
    </div>
  )
}
