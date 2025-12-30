'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Effect types with both vertex (position) and fragment (color) behaviors
const EFFECT_TEMPLATES = {
  rainbow: {
    name: 'Rainbow',
    description: 'Cycles through rainbow colors based on position and time',
    type: 'fragment',
    glsl: `// Fragment shader - rainbow color cycling
float hue = fract(charIndex * 0.03 + timeSeconds * speed * 0.03);
vec3 rgb = hsv2rgb(vec3(hue, 0.9, 1.0));
texColor.rgb = rgb;`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const hue = ((charIndex * 0.03 + time * speed * 0.03) % 1) * 360
      ctx.fillStyle = `hsl(${hue}, 90%, 60%)`
      ctx.fillText(char, x, y)
    }
  },
  wave: {
    name: 'Wave',
    description: 'Vertical sine wave motion',
    type: 'vertex',
    glsl: `// Vertex shader - wave motion
float phase = charIndex * 0.6 + timeSeconds * speed * 2.0;
float amplitude = max(1.0, param) * 0.15;
pos.y += sin(phase) * amplitude;`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const phase = charIndex * 0.6 + time * speed * 2.0
      const amplitude = Math.max(1, param) * 8
      const offsetY = Math.sin(phase) * amplitude
      ctx.fillStyle = baseColor
      ctx.fillText(char, x, y + offsetY)
    }
  },
  shake: {
    name: 'Shake',
    description: 'Random jitter effect',
    type: 'vertex',
    glsl: `// Vertex shader - random shake
float seed = charIndex + floor(timeSeconds * speed * 8.0);
float amplitude = max(1.0, param) * 0.15;
pos.x += (fract(sin(seed * 12.9898) * 43758.5453) - 0.5) * amplitude;
pos.y += (fract(sin(seed * 78.233) * 43758.5453) - 0.5) * amplitude;`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const seed = charIndex + Math.floor(time * speed * 8.0)
      const amplitude = Math.max(1, param) * 6
      const randX = (Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1 - 0.5) * amplitude
      const randY = (Math.abs(Math.sin(seed * 78.233) * 43758.5453) % 1 - 0.5) * amplitude
      ctx.fillStyle = baseColor
      ctx.fillText(char, x + randX, y + randY)
    }
  },
  pulse: {
    name: 'Pulse',
    description: 'Opacity fades in and out',
    type: 'fragment',
    glsl: `// Fragment shader - pulse opacity
float pulse = (sin(timeSeconds * speed * 0.5 + charIndex * 0.3) + 1.0) * 0.5;
texColor.a *= 0.3 + pulse * 0.7;`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const pulse = (Math.sin(time * speed * 0.5 + charIndex * 0.3) + 1) * 0.5
      const alpha = 0.3 + pulse * 0.7
      ctx.globalAlpha = alpha
      ctx.fillStyle = baseColor
      ctx.fillText(char, x, y)
      ctx.globalAlpha = 1
    }
  },
  breathing: {
    name: 'Breathing',
    description: 'Slow, smooth scale pulsing',
    type: 'vertex',
    glsl: `// Vertex shader - breathing scale
float breath = (sin(timeSeconds * speed * 0.3) + 1.0) * 0.1 + 0.9;
pos *= breath;`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string, totalChars: number, centerX: number) => {
      const breath = (Math.sin(time * speed * 0.3) + 1) * 0.08 + 0.92
      const offsetX = (x - centerX) * (breath - 1)
      ctx.fillStyle = baseColor
      ctx.fillText(char, x + offsetX, y)
    }
  },
  glitch: {
    name: 'Glitch',
    description: 'Digital glitch/corruption',
    type: 'fragment',
    glsl: `// Fragment shader - glitch effect
float t = floor(timeSeconds * speed * 5.0);
float rand = fract(sin(t * 12.9898 + charIndex * 78.233) * 43758.5453);
if (rand > 0.9) {
    texColor.rgb = vec3(texColor.g, texColor.b, texColor.r);
}`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const t = Math.floor(time * speed * 5.0)
      const rand = Math.abs(Math.sin(t * 12.9898 + charIndex * 78.233) * 43758.5453) % 1

      if (rand > 0.9) {
        // Color shift glitch
        ctx.fillStyle = '#00ffff'
      } else if (rand > 0.85) {
        ctx.fillStyle = '#ff00ff'
      } else {
        ctx.fillStyle = baseColor
      }

      // Position glitch
      const glitchX = rand > 0.92 ? (rand - 0.5) * 10 : 0
      ctx.fillText(char, x + glitchX, y)
    }
  },
  colorShift: {
    name: 'Color Shift',
    description: 'Hue rotation over time',
    type: 'fragment',
    glsl: `// Fragment shader - hue rotation
float angle = timeSeconds * speed * 0.5;
// Apply hue rotation matrix to texColor.rgb`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const hue = (time * speed * 30) % 360
      ctx.fillStyle = `hsl(${hue}, 80%, 65%)`
      ctx.fillText(char, x, y)
    }
  },
  fadeIn: {
    name: 'Fade In',
    description: 'Characters fade in from transparent',
    type: 'fragment',
    glsl: `// Fragment shader - fade in
float delay = charIndex * 0.1;
float alpha = clamp((timeSeconds * speed - delay) * 2.0, 0.0, 1.0);
texColor.a *= alpha;`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const delay = charIndex * 0.1
      const alpha = Math.max(0, Math.min(1, (time * speed - delay) * 2.0))
      ctx.globalAlpha = alpha
      ctx.fillStyle = baseColor
      ctx.fillText(char, x, y)
      ctx.globalAlpha = 1
    }
  },
  custom: {
    name: 'Custom',
    description: 'Write your own effect',
    type: 'both',
    glsl: `// Custom effect - edit this code!
// Vertex: modify pos.x, pos.y for movement
// Fragment: modify texColor.rgb or texColor.a

// Example: wavy rainbow
float phase = charIndex * 0.5 + timeSeconds * speed;
pos.y += sin(phase) * 0.1;

float hue = fract(charIndex * 0.05 + timeSeconds * 0.1);
texColor.rgb = hsv2rgb(vec3(hue, 0.8, 1.0));`,
    apply: (ctx: CanvasRenderingContext2D, char: string, x: number, y: number, charIndex: number, time: number, speed: number, param: number, baseColor: string) => {
      const phase = charIndex * 0.5 + time * speed
      const offsetY = Math.sin(phase) * 8
      const hue = ((charIndex * 0.05 + time * 0.1) % 1) * 360
      ctx.fillStyle = `hsl(${hue}, 80%, 60%)`
      ctx.fillText(char, x, y + offsetY)
    }
  },
}

type EffectKey = keyof typeof EFFECT_TEMPLATES

interface ShaderPreviewProps {
  initialTemplate?: EffectKey
  compact?: boolean
  showCode?: boolean
  initialText?: string
}

export default function ShaderPreview({
  initialTemplate = 'rainbow',
  compact = false,
  showCode: initialShowCode = true,
  initialText = 'Hello Oraxen!'
}: ShaderPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  const [selectedTemplate, setSelectedTemplate] = useState<EffectKey>(initialTemplate)
  const [glslCode, setGlslCode] = useState(EFFECT_TEMPLATES[initialTemplate].glsl)
  const [sampleText, setSampleText] = useState(initialText)
  const [speed, setSpeed] = useState(3)
  const [param, setParam] = useState(3)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [fontSize, setFontSize] = useState(compact ? 24 : 32)
  const [isPlaying, setIsPlaying] = useState(true)
  const [fontLoaded, setFontLoaded] = useState(false)
  const [showCode, setShowCode] = useState(initialShowCode && !compact)

  // Load Minecraft font
  useEffect(() => {
    const font = new FontFace('Minecraft', 'url(/fonts/Minecraft-Seven_v2.woff2)')
    font.load().then((loadedFont) => {
      document.fonts.add(loadedFont)
      setFontLoaded(true)
    }).catch(() => {
      setFontLoaded(true) // Fallback to monospace
    })
  }, [])

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = (Date.now() - startTimeRef.current) / 1000
    const effect = EFFECT_TEMPLATES[selectedTemplate]

    // Setup canvas
    ctx.font = `${fontSize}px Minecraft, monospace`
    const padding = compact ? 12 : 20

    // Measure text for sizing
    const chars = sampleText.split('')
    let totalWidth = 0
    const charWidths: number[] = []
    for (const char of chars) {
      const width = ctx.measureText(char).width
      charWidths.push(width)
      totalWidth += width
    }

    const canvasWidth = Math.max(200, totalWidth + padding * 2)
    const canvasHeight = fontSize * 1.8 + padding * 2

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }

    // Clear with background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Setup text rendering
    ctx.font = `${fontSize}px Minecraft, monospace`
    ctx.textBaseline = 'middle'
    ctx.imageSmoothingEnabled = false

    // Draw each character with effect
    let x = padding
    const y = canvas.height / 2
    const centerX = canvas.width / 2

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      effect.apply(ctx, char, x, y, i, time, speed, param, textColor, chars.length, centerX)
      x += charWidths[i]
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(render)
    }
  }, [selectedTemplate, sampleText, speed, param, textColor, bgColor, fontSize, isPlaying, compact])

  // Start/stop animation
  useEffect(() => {
    if (!fontLoaded) return

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(render)
    } else {
      render() // Render one frame when paused
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [fontLoaded, isPlaying, render])

  // Handle template change
  const handleTemplateChange = (template: EffectKey) => {
    setSelectedTemplate(template)
    setGlslCode(EFFECT_TEMPLATES[template].glsl)
  }

  const resetTime = () => {
    startTimeRef.current = Date.now()
  }

  const effect = EFFECT_TEMPLATES[selectedTemplate]

  if (compact) {
    return (
      <div style={{
        border: '1px solid var(--nextra-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--nextra-bg)',
      }}>
        {/* Compact template selector */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--nextra-border)',
          backgroundColor: 'var(--nextra-code-bg)',
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          {Object.entries(EFFECT_TEMPLATES).slice(0, 6).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateChange(key as EffectKey)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: selectedTemplate === key ? '1px solid var(--nextra-primary)' : '1px solid transparent',
                backgroundColor: selectedTemplate === key ? 'var(--nextra-primary-alpha)' : 'transparent',
                color: 'var(--nextra-fg)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {template.name}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div style={{
          padding: '12px',
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: bgColor,
        }}>
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
          />
        </div>

        {/* Minimal controls */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--nextra-border)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          fontSize: '11px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ opacity: 0.6 }}>Speed:</span>
            <input
              type="range"
              min="1"
              max="7"
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              style={{ width: '60px' }}
            />
            <span style={{ fontFamily: 'monospace' }}>{speed}</span>
          </div>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>
    )
  }

  // Full version
  return (
    <div style={{
      border: '1px solid var(--nextra-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginTop: '20px',
      marginBottom: '20px',
      backgroundColor: 'var(--nextra-bg)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--nextra-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Shader Preview</h3>
          <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.6 }}>
            Test GLSL effects with Minecraft font
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setShowCode(!showCode)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: showCode ? 'var(--nextra-primary-alpha)' : 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={resetTime}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Template Selection */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--nextra-border)',
        backgroundColor: 'var(--nextra-code-bg)',
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(EFFECT_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateChange(key as EffectKey)}
              title={template.description}
              style={{
                padding: '5px 10px',
                borderRadius: '4px',
                border: selectedTemplate === key ? '2px solid var(--nextra-primary)' : '1px solid var(--nextra-border)',
                backgroundColor: selectedTemplate === key ? 'var(--nextra-primary-alpha)' : 'transparent',
                color: 'var(--nextra-fg)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: selectedTemplate === key ? 600 : 400,
              }}
            >
              {template.name}
              {template.type === 'vertex' && <span style={{ opacity: 0.5, marginLeft: '4px' }}>↕</span>}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.5 }}>
          <strong>{effect.name}</strong>: {effect.description}
          {effect.type === 'vertex' && ' (vertex shader - position effect)'}
          {effect.type === 'fragment' && ' (fragment shader - color effect)'}
        </div>
      </div>

      {/* Preview Canvas */}
      <div style={{
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100px',
        backgroundColor: bgColor,
      }}>
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', imageRendering: 'pixelated', borderRadius: '4px' }}
        />
      </div>

      {/* Controls */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--nextra-border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' }}>
            Text
          </label>
          <input
            type="text"
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'var(--nextra-bg)',
              color: 'var(--nextra-fg)',
              fontSize: '12px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' }}>
            Speed ({speed})
          </label>
          <input type="range" min="1" max="7" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' }}>
            Param ({param})
          </label>
          <input type="range" min="0" max="7" value={param} onChange={(e) => setParam(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' }}>
            Size ({fontSize}px)
          </label>
          <input type="range" min="16" max="48" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' }}>
            Text Color
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              style={{ width: '32px', height: '28px', padding: 0, border: '1px solid var(--nextra-border)', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--nextra-border)', backgroundColor: 'var(--nextra-bg)', color: 'var(--nextra-fg)', fontSize: '11px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' }}>
            Background
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ width: '32px', height: '28px', padding: 0, border: '1px solid var(--nextra-border)', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--nextra-border)', backgroundColor: 'var(--nextra-bg)', color: 'var(--nextra-fg)', fontSize: '11px', fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </div>

      {/* GLSL Code */}
      {showCode && (
        <div style={{ borderTop: '1px solid var(--nextra-border)' }}>
          <div style={{
            padding: '6px 16px',
            backgroundColor: 'var(--nextra-code-bg)',
            borderBottom: '1px solid var(--nextra-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>GLSL CODE</span>
            <span style={{ fontSize: '10px', opacity: 0.4 }}>
              {effect.type === 'vertex' ? 'Vertex shader (position)' : effect.type === 'fragment' ? 'Fragment shader (color)' : 'Both shaders'}
            </span>
          </div>
          <pre style={{
            margin: 0,
            padding: '12px 16px',
            backgroundColor: 'var(--nextra-code-bg)',
            color: 'var(--nextra-fg)',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1.5,
            overflow: 'auto',
            maxHeight: '200px',
          }}>
            <code>{glslCode}</code>
          </pre>
        </div>
      )}

      {/* Footer tip */}
      <div style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--nextra-border)',
        backgroundColor: 'var(--nextra-code-bg)',
        fontSize: '10px',
        opacity: 0.5,
      }}>
        <strong>Tip:</strong> Effects marked with ↕ use vertex shaders for position changes. Others use fragment shaders for color/opacity.
      </div>
    </div>
  )
}

// Export effect templates for use by other components
export { EFFECT_TEMPLATES }
export type { EffectKey }
