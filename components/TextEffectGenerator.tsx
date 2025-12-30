'use client'

import { useState, useMemo } from 'react'

const EFFECTS = [
  { id: 0, name: 'rainbow', label: 'Rainbow', description: 'Cycles through rainbow colors' },
  { id: 1, name: 'wave', label: 'Wave', description: 'Vertical sine wave motion' },
  { id: 2, name: 'shake', label: 'Shake', description: 'Random jitter' },
  { id: 3, name: 'pulse', label: 'Pulse', description: 'Opacity fades in/out' },
  { id: 4, name: 'gradient', label: 'Gradient', description: 'Static color gradient' },
  { id: 5, name: 'typewriter', label: 'Typewriter', description: 'Characters appear sequentially' },
]

// Alpha LSB encoding constants (matching AlphaLsbEncoding.java)
const LSB_BITS = 4
const LOW_MASK = (1 << LSB_BITS) - 1 // 0x0F
const DATA_MASK = (1 << (LSB_BITS - 1)) - 1 // 0x07
const DATA_MIN = 1
const DATA_GAP = 5

function encodeNibble(data: number): number {
  let encoded = (data & DATA_MASK) + DATA_MIN
  if (DATA_GAP >= 0 && encoded >= DATA_GAP) {
    encoded += 1
  }
  return encoded
}

function encodeChannel(base: number, data: number): number {
  return (base & ~LOW_MASK) | encodeNibble(data)
}

function avoidAnimationSentinels(red: number): number {
  // Avoid R=254 and shadow range (62-64) which are reserved for animated glyphs
  if (red === 254) return red - 16
  if (red >= 62 && red <= 64) return red + 16
  return red
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function encodeTextEffect(
  baseColor: { r: number; g: number; b: number },
  effectId: number,
  speed: number,
  param: number
): { r: number; g: number; b: number; hex: string } {
  const effectClamped = effectId & DATA_MASK
  const speedClamped = clamp(speed, 1, DATA_MASK)
  const paramClamped = clamp(param, 0, DATA_MASK)

  const rEnc = avoidAnimationSentinels(encodeChannel(baseColor.r, effectClamped))
  const gEnc = encodeChannel(baseColor.g, speedClamped)
  const bEnc = encodeChannel(baseColor.b, paramClamped)

  const hex = `#${rEnc.toString(16).padStart(2, '0')}${gEnc.toString(16).padStart(2, '0')}${bEnc.toString(16).padStart(2, '0')}`

  return { r: rEnc, g: gEnc, b: bEnc, hex: hex.toUpperCase() }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 }
}

export default function TextEffectGenerator() {
  const [effectId, setEffectId] = useState(0)
  const [speed, setSpeed] = useState(3)
  const [param, setParam] = useState(3)
  const [baseColorHex, setBaseColorHex] = useState('#FFFFFF')
  const [sampleText, setSampleText] = useState('Hello World!')

  const baseColor = useMemo(() => hexToRgb(baseColorHex), [baseColorHex])
  const effect = EFFECTS.find((e) => e.id === effectId) || EFFECTS[0]

  const encodedColors = useMemo(() => {
    return sampleText.split('').map((char, index) => {
      const encoded = encodeTextEffect(baseColor, effectId, speed, param)
      return { char, ...encoded, index }
    })
  }, [sampleText, baseColor, effectId, speed, param])

  const firstEncoded = encodedColors[0] || encodeTextEffect(baseColor, effectId, speed, param)

  return (
    <div
      style={{
        border: '1px solid var(--nextra-border)',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '16px',
        marginBottom: '16px',
        backgroundColor: 'var(--nextra-bg)',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Text Effect Color Generator</h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <label
            style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' }}
          >
            Effect Type
          </label>
          <select
            value={effectId}
            onChange={(e) => setEffectId(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'var(--nextra-bg)',
              color: 'var(--nextra-fg)',
            }}
          >
            {EFFECTS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} - {e.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' }}
          >
            Speed (1-7): {speed}
          </label>
          <input
            type="range"
            min="1"
            max="7"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label
            style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' }}
          >
            Param (0-7): {param}
          </label>
          <input
            type="range"
            min="0"
            max="7"
            value={param}
            onChange={(e) => setParam(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label
            style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' }}
          >
            Base Color
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="color"
              value={baseColorHex}
              onChange={(e) => setBaseColorHex(e.target.value)}
              style={{ width: '50px', height: '36px', padding: 0, border: 'none' }}
            />
            <input
              type="text"
              value={baseColorHex}
              onChange={(e) => setBaseColorHex(e.target.value)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--nextra-border)',
                backgroundColor: 'var(--nextra-bg)',
                color: 'var(--nextra-fg)',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '14px' }}>
          Sample Text
        </label>
        <input
          type="text"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--nextra-border)',
            backgroundColor: 'var(--nextra-bg)',
            color: 'var(--nextra-fg)',
          }}
        />
      </div>

      <div
        style={{
          backgroundColor: 'var(--nextra-code-bg)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Encoded Color</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: firstEncoded.hex,
              borderRadius: '8px',
              border: '2px solid var(--nextra-border)',
            }}
          />
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold' }}>
              {firstEncoded.hex}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              RGB({firstEncoded.r}, {firstEncoded.g}, {firstEncoded.b})
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--nextra-code-bg)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Preview (with per-character colors)</h4>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '18px',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {encodedColors.map((c, i) => (
            <span
              key={i}
              style={{
                color: c.hex,
                textShadow: '0 0 2px rgba(0,0,0,0.5)',
              }}
            >
              {c.char}
            </span>
          ))}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
          Note: In-game, the shader will animate this text with the {effect.name} effect.
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--nextra-code-bg)',
          padding: '16px',
          borderRadius: '8px',
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: '12px' }}>MiniMessage Format</h4>
        <code
          style={{
            display: 'block',
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '13px',
          }}
        >
          {encodedColors.map((c) => `<${c.hex}>${c.char}`).join('')}
        </code>
        <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
          Use this in any plugin that supports MiniMessage formatting.
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--nextra-code-bg)',
          padding: '16px',
          borderRadius: '8px',
          marginTop: '16px',
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: '12px' }}>Encoding Details</h4>
        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>Effect Type</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                {effect.name} (ID: {effectId})
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>Speed</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{speed}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>Param</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{param}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>Base Color</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                {baseColorHex} (R:{baseColor.r}, G:{baseColor.g}, B:{baseColor.b})
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>R Channel</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                Base high bits + effect type in low bits = {firstEncoded.r} (0x
                {firstEncoded.r.toString(16).padStart(2, '0')})
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>G Channel</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                Base high bits + speed in low bits = {firstEncoded.g} (0x
                {firstEncoded.g.toString(16).padStart(2, '0')})
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', fontWeight: 500 }}>B Channel</td>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>
                Base high bits + param in low bits = {firstEncoded.b} (0x
                {firstEncoded.b.toString(16).padStart(2, '0')})
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
