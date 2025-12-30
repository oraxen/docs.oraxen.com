'use client'

import { useState, useMemo } from 'react'

const PRESET_EFFECTS = [
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

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid var(--nextra-border)',
  backgroundColor: 'var(--nextra-bg)',
  color: 'var(--nextra-fg)',
  fontSize: '14px',
}

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: 600,
  fontSize: '13px',
  color: 'var(--nextra-fg)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const cardStyle = {
  backgroundColor: 'var(--nextra-code-bg)',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '12px',
}

export default function TextEffectGenerator() {
  const [useCustomId, setUseCustomId] = useState(false)
  const [effectId, setEffectId] = useState(0)
  const [speed, setSpeed] = useState(3)
  const [param, setParam] = useState(3)
  const [baseColorHex, setBaseColorHex] = useState('#FFFFFF')
  const [sampleText, setSampleText] = useState('Hello World!')
  const [copied, setCopied] = useState<string | null>(null)

  const baseColor = useMemo(() => hexToRgb(baseColorHex), [baseColorHex])
  const presetEffect = PRESET_EFFECTS.find((e) => e.id === effectId)
  const effectName = presetEffect?.name ?? `custom_${effectId}`

  const encodedColor = useMemo(
    () => encodeTextEffect(baseColor, effectId, speed, param),
    [baseColor, effectId, speed, param]
  )

  const miniMessage = `<${encodedColor.hex}>${sampleText}`

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div
      style={{
        border: '1px solid var(--nextra-border)',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '20px',
        marginBottom: '20px',
        backgroundColor: 'var(--nextra-bg)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Color Code Generator</h3>
        <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.7 }}>
          Generate hex color codes for applying text effects programmatically
        </p>
      </div>

      {/* Effect Selection */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <label style={{ ...labelStyle, marginBottom: 0, flex: 'none' }}>Effect Type</label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            <input
              type="checkbox"
              checked={useCustomId}
              onChange={(e) => setUseCustomId(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Use custom ID
          </label>
        </div>

        {useCustomId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              min="0"
              max="7"
              value={effectId}
              onChange={(e) => setEffectId(clamp(parseInt(e.target.value) || 0, 0, 7))}
              style={{ ...inputStyle, width: '80px', textAlign: 'center', fontFamily: 'monospace' }}
            />
            <span style={{ fontSize: '13px', opacity: 0.6 }}>
              Enter effect ID (0-7) for custom effects defined in text_effects.yml
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {PRESET_EFFECTS.map((e) => (
              <button
                key={e.id}
                onClick={() => setEffectId(e.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border:
                    effectId === e.id
                      ? '2px solid var(--nextra-primary)'
                      : '1px solid var(--nextra-border)',
                  backgroundColor: effectId === e.id ? 'var(--nextra-primary-alpha)' : 'transparent',
                  color: 'var(--nextra-fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{e.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>{e.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Parameters Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Speed */}
        <div style={cardStyle}>
          <label style={labelStyle}>Speed</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="1"
              max="7"
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '16px',
                minWidth: '20px',
                textAlign: 'center',
              }}
            >
              {speed}
            </span>
          </div>
        </div>

        {/* Param */}
        <div style={cardStyle}>
          <label style={labelStyle}>Param</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="0"
              max="7"
              value={param}
              onChange={(e) => setParam(parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: '16px',
                minWidth: '20px',
                textAlign: 'center',
              }}
            >
              {param}
            </span>
          </div>
        </div>

        {/* Base Color */}
        <div style={cardStyle}>
          <label style={labelStyle}>Base Color</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={baseColorHex}
              onChange={(e) => setBaseColorHex(e.target.value)}
              style={{
                width: '42px',
                height: '42px',
                padding: 0,
                border: '2px solid var(--nextra-border)',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              value={baseColorHex}
              onChange={(e) => setBaseColorHex(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', flex: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Sample Text */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <label style={labelStyle}>Sample Text</label>
        <input
          type="text"
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Output Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--nextra-code-bg) 0%, var(--nextra-bg) 100%)',
          border: '2px solid var(--nextra-border)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          {/* Color Preview */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: encodedColor.hex,
                borderRadius: '12px',
                border: '3px solid var(--nextra-border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
            <div
              style={{
                marginTop: '8px',
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => copyToClipboard(encodedColor.hex, 'hex')}
              title="Click to copy"
            >
              {encodedColor.hex}
              {copied === 'hex' && (
                <span style={{ fontSize: '11px', marginLeft: '6px', opacity: 0.7 }}>copied!</span>
              )}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>
              RGB({encodedColor.r}, {encodedColor.g}, {encodedColor.b})
            </div>
          </div>

          {/* Text Preview & MiniMessage */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.5, marginBottom: '6px' }}>
                PREVIEW
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '20px',
                  color: encodedColor.hex,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  padding: '8px 0',
                }}
              >
                {sampleText}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.5, marginBottom: '6px' }}>
                MINIMESSAGE
              </div>
              <div
                onClick={() => copyToClipboard(miniMessage, 'mini')}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  cursor: 'pointer',
                  wordBreak: 'break-all',
                }}
                title="Click to copy"
              >
                {miniMessage}
                {copied === 'mini' && (
                  <span
                    style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7, fontWeight: 600 }}
                  >
                    copied!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Encoding Details - Collapsible */}
        <details style={{ marginTop: '16px' }}>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              opacity: 0.6,
              padding: '4px 0',
            }}
          >
            Encoding Details
          </summary>
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px' }}>
              <span style={{ opacity: 0.6 }}>Effect:</span>
              <span>
                {effectName} (ID: {effectId})
              </span>
              <span style={{ opacity: 0.6 }}>Speed:</span>
              <span>{speed}</span>
              <span style={{ opacity: 0.6 }}>Param:</span>
              <span>{param}</span>
              <span style={{ opacity: 0.6 }}>R channel:</span>
              <span>
                {baseColor.r} → {encodedColor.r} (effect in low bits)
              </span>
              <span style={{ opacity: 0.6 }}>G channel:</span>
              <span>
                {baseColor.g} → {encodedColor.g} (speed in low bits)
              </span>
              <span style={{ opacity: 0.6 }}>B channel:</span>
              <span>
                {baseColor.b} → {encodedColor.b} (param in low bits)
              </span>
            </div>
          </div>
        </details>

        <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '12px' }}>
          All characters use the same color. The shader derives per-character index from gl_VertexID.
        </div>
      </div>
    </div>
  )
}
