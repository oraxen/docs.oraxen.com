'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Simple GLSL syntax highlighter
function highlightGLSL(code: string): string {
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Comments (single line)
  result = result.replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>')

  // Numbers (including floats)
  result = result.replace(/\b(\d+\.?\d*f?)\b/g, '<span style="color:#b5cea8">$1</span>')

  // GLSL types
  result = result.replace(/\b(void|float|int|bool|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D)\b/g, '<span style="color:#4ec9b0">$1</span>')

  // GLSL keywords
  result = result.replace(/\b(if|else|for|while|return|break|continue|discard)\b/g, '<span style="color:#c586c0">$1</span>')

  // GLSL built-in functions
  result = result.replace(/\b(sin|cos|tan|abs|floor|ceil|fract|mod|min|max|clamp|mix|step|smoothstep|length|normalize|dot|cross|pow|sqrt|exp|log)\b/g, '<span style="color:#dcdcaa">$1</span>')

  // Custom variables we use
  result = result.replace(/\b(pos|texColor|charIndex|timeSeconds|speed|param|effectType)\b/g, '<span style="color:#9cdcfe">$1</span>')

  // Function declarations (hsv2rgb, etc)
  result = result.replace(/\b(hsv2rgb)\b/g, '<span style="color:#dcdcaa">$1</span>')

  return result
}

interface ParsedShader {
  posX: ((vars: GLSLVars) => number) | null
  posY: ((vars: GLSLVars) => number) | null
  color: ((vars: GLSLVars) => { r: number; g: number; b: number } | null) | null
  alpha: ((vars: GLSLVars) => number) | null
}

// GLSL to JavaScript interpreter
function parseGLSL(code: string): ParsedShader {
  // Remove comments
  const cleanCode = code.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

  let posXExpr: string | null = null
  let posYExpr: string | null = null
  let alphaExpr: string | null = null
  let hueExpr: string | null = null

  // Parse pos.x and pos.y modifications
  const posXMatch = cleanCode.match(/pos\.x\s*\+=\s*([^;]+);/)
  const posYMatch = cleanCode.match(/pos\.y\s*\+=\s*([^;]+);/)

  if (posXMatch) posXExpr = posXMatch[1]
  if (posYMatch) posYExpr = posYMatch[1]

  // Parse texColor.a modifications
  const alphaMatch = cleanCode.match(/texColor\.a\s*\*=\s*([^;]+);/)
  if (alphaMatch) alphaExpr = alphaMatch[1]

  // Parse hue for hsv2rgb
  const hueMatch = cleanCode.match(/float\s+hue\s*=\s*([^;]+);/)
  if (hueMatch) hueExpr = hueMatch[1]

  // Convert GLSL expression to JavaScript
  const glslToJS = (expr: string): string => {
    return expr
      .replace(/\bfract\s*\(/g, 'fract(')
      .replace(/\bfloor\s*\(/g, 'Math.floor(')
      .replace(/\bceil\s*\(/g, 'Math.ceil(')
      .replace(/\bsin\s*\(/g, 'Math.sin(')
      .replace(/\bcos\s*\(/g, 'Math.cos(')
      .replace(/\babs\s*\(/g, 'Math.abs(')
      .replace(/\bmax\s*\(/g, 'Math.max(')
      .replace(/\bmin\s*\(/g, 'Math.min(')
      .replace(/\bpow\s*\(/g, 'Math.pow(')
      .replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
      .replace(/\bclamp\s*\(/g, 'clamp(')
      .replace(/\bmix\s*\(/g, 'mix(')
      .replace(/\bstep\s*\(/g, 'step(')
      .replace(/\bsmoothstep\s*\(/g, 'smoothstep(')
      .replace(/\bmod\s*\(/g, 'mod(')
      .replace(/(\d+\.\d*|\d+)f\b/g, '$1') // Remove 'f' suffix from floats
  }

  const createEvaluator = (expr: string | null) => {
    if (!expr) return null
    const jsExpr = glslToJS(expr)
    try {
      // Create a safe function that only has access to math helpers and variables
      return new Function('vars', `
        const { charIndex, timeSeconds, speed, param, hue, amplitude, phase, seed, pulse, breath } = vars;
        const fract = (x) => x - Math.floor(x);
        const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
        const mix = (a, b, t) => a * (1 - t) + b * t;
        const step = (edge, x) => x < edge ? 0 : 1;
        const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
        const mod = (x, y) => x - y * Math.floor(x / y);
        try {
          return ${jsExpr};
        } catch(e) {
          return 0;
        }
      `) as (vars: GLSLVars) => number
    } catch {
      return null
    }
  }

  // Create color evaluator that handles hsv2rgb
  const createColorEvaluator = () => {
    if (hueExpr) {
      const jsHue = glslToJS(hueExpr)
      try {
        // Create a sandboxed function like createEvaluator does
        const hueEvaluator = new Function('vars', `
          const { charIndex, timeSeconds, speed, param, hue, amplitude, phase, seed, pulse, breath } = vars;
          const fract = (x) => x - Math.floor(x);
          const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
          const mix = (a, b, t) => a * (1 - t) + b * t;
          const step = (edge, x) => x < edge ? 0 : 1;
          const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
          const mod = (x, y) => x - y * Math.floor(x / y);
          try {
            return ${jsHue};
          } catch(e) {
            return 0;
          }
        `) as (vars: GLSLVars) => number

        return (vars: GLSLVars) => {
          try {
            const hueVal = hueEvaluator(vars)
            // HSV to RGB conversion
            const fract = (x: number) => x - Math.floor(x)
            const h = fract(hueVal) * 6
            const s = 0.9
            const v = 1.0
            const i = Math.floor(h)
            const f = h - i
            const p = v * (1 - s)
            const q = v * (1 - s * f)
            const t = v * (1 - s * (1 - f))
            let r = 0, g = 0, b = 0
            switch (i % 6) {
              case 0: r = v; g = t; b = p; break
              case 1: r = q; g = v; b = p; break
              case 2: r = p; g = v; b = t; break
              case 3: r = p; g = q; b = v; break
              case 4: r = t; g = p; b = v; break
              case 5: r = v; g = p; b = q; break
            }
            return { r: r * 255, g: g * 255, b: b * 255 }
          } catch {
            return null
          }
        }
      } catch {
        return null
      }
    }
    return null
  }

  return {
    posX: createEvaluator(posXExpr),
    posY: createEvaluator(posYExpr),
    color: createColorEvaluator(),
    alpha: createEvaluator(alphaExpr),
  }
}

interface GLSLVars {
  charIndex: number
  timeSeconds: number
  speed: number
  param: number
  hue?: number
  amplitude?: number
  phase?: number
  seed?: number
  pulse?: number
  breath?: number
}

// Effect templates with separate vertex and fragment shaders
const EFFECT_TEMPLATES = {
  rainbow: {
    name: 'Rainbow',
    description: 'Cycles through rainbow colors (fragment only)',
    vertexGlsl: null,
    fragmentGlsl: `// Fragment shader - rainbow color cycling
float hue = fract(charIndex * 0.03 + timeSeconds * speed * 0.03);
vec3 rgb = hsv2rgb(vec3(hue, 0.9, 1.0));
texColor.rgb = rgb;`,
  },
  wave: {
    name: 'Wave',
    description: 'Vertical sine wave motion (vertex only)',
    vertexGlsl: `// Vertex shader - wave motion
float phase = charIndex * 0.6 + timeSeconds * speed * 2.0;
float amplitude = max(1.0, param) * 0.15;
pos.y += sin(phase) * amplitude;`,
    fragmentGlsl: null,
  },
  shake: {
    name: 'Shake',
    description: 'Random jitter effect (vertex only)',
    vertexGlsl: `// Vertex shader - shake/jitter using hash-based random
// Uses floor() for discrete frames, fract(sin()*43758) for pseudo-random
pos.x += (fract(sin((charIndex + floor(timeSeconds * speed * 8.0)) * 12.9898) * 43758.5453) - 0.5) * max(1.0, param) * 0.2;
pos.y += (fract(sin((charIndex + floor(timeSeconds * speed * 8.0)) * 78.233) * 43758.5453) - 0.5) * max(1.0, param) * 0.2;`,
    fragmentGlsl: null,
  },
  rainbowWave: {
    name: 'Rainbow Wave',
    description: 'Rainbow colors with wave motion (both shaders)',
    vertexGlsl: `// Vertex shader - wave motion
float phase = charIndex * 0.6 + timeSeconds * speed * 2.0;
float amplitude = max(1.0, param) * 0.15;
pos.y += sin(phase) * amplitude;`,
    fragmentGlsl: `// Fragment shader - rainbow color
float hue = fract(charIndex * 0.03 + timeSeconds * speed * 0.03);
vec3 rgb = hsv2rgb(vec3(hue, 0.9, 1.0));
texColor.rgb = rgb;`,
  },
}

type EffectKey = keyof typeof EFFECT_TEMPLATES

interface ShaderPreviewProps {
  initialTemplate?: EffectKey
  compact?: boolean
  showCode?: boolean
  initialText?: string
}

// Code editor component with syntax highlighting
function CodeEditor({
  label,
  code,
  onChange,
  placeholder,
  status,
  error,
}: {
  label: string
  code: string
  onChange: (code: string) => void
  placeholder?: string
  status: 'valid' | 'error' | 'compiling' | 'empty'
  error: string | null
}) {
  return (
    <div style={{ flex: 1, minWidth: '280px' }}>
      <div style={{
        padding: '6px 12px',
        backgroundColor: 'var(--nextra-bg)',
        borderBottom: '1px solid var(--nextra-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', fontWeight: 600, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '6px' }}>
          {label}
          {status === 'compiling' && (
            <span style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '3px', color: '#3b82f6' }}>
              ⏳
            </span>
          )}
          {status === 'valid' && (
            <span style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: 'rgba(34, 197, 94, 0.2)', borderRadius: '3px', color: '#22c55e' }}>
              ✓
            </span>
          )}
          {status === 'error' && (
            <span style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '3px', color: '#ef4444' }} title={error || ''}>
              ✗
            </span>
          )}
          {status === 'empty' && (
            <span style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: 'rgba(156, 163, 175, 0.2)', borderRadius: '3px', color: '#9ca3af' }}>
              —
            </span>
          )}
        </span>
      </div>
      {status === 'error' && error && (
        <div style={{
          padding: '6px 12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '10px',
        }}>
          ⚠ {error}
        </div>
      )}
      <div style={{ position: 'relative', backgroundColor: '#1e1e1e' }}>
        <pre
          aria-hidden="true"
          style={{
            margin: 0,
            padding: '10px 12px',
            backgroundColor: 'transparent',
            color: 'var(--nextra-fg)',
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'hidden',
            minHeight: '100px',
          }}
          dangerouslySetInnerHTML={{ __html: code ? highlightGLSL(code) : `<span style="color:#6a9955">${placeholder || '// Empty'}</span>` }}
        />
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            padding: '10px 12px',
            backgroundColor: 'transparent',
            color: 'transparent',
            caretColor: '#ffffff',
            fontSize: '11px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            lineHeight: 1.5,
            border: 'none',
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

export default function ShaderPreview({
  initialTemplate = 'rainbowWave',
  compact = false,
  showCode: initialShowCode = true,
  initialText = 'Hello Oraxen!'
}: ShaderPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())
  const containerRef = useRef<HTMLDivElement>(null)

  const [selectedTemplate, setSelectedTemplate] = useState<EffectKey>(initialTemplate)
  const [vertexCode, setVertexCode] = useState(EFFECT_TEMPLATES[initialTemplate].vertexGlsl || '')
  const [fragmentCode, setFragmentCode] = useState(EFFECT_TEMPLATES[initialTemplate].fragmentGlsl || '')
  const [compiledVertex, setCompiledVertex] = useState<ParsedShader>(() => parseGLSL(EFFECT_TEMPLATES[initialTemplate].vertexGlsl || ''))
  const [compiledFragment, setCompiledFragment] = useState<ParsedShader>(() => parseGLSL(EFFECT_TEMPLATES[initialTemplate].fragmentGlsl || ''))
  const [sampleText, setSampleText] = useState(initialText)
  const [speed, setSpeed] = useState(3)
  const [param, setParam] = useState(3)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [fontSize, setFontSize] = useState(compact ? 24 : 32)
  const [isPlaying, setIsPlaying] = useState(true)
  const [fontLoaded, setFontLoaded] = useState(false)
  const [showCode, setShowCode] = useState(initialShowCode && !compact)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [vertexStatus, setVertexStatus] = useState<'valid' | 'error' | 'compiling' | 'empty'>('valid')
  const [fragmentStatus, setFragmentStatus] = useState<'valid' | 'error' | 'compiling' | 'empty'>('valid')
  const [vertexError, setVertexError] = useState<string | null>(null)
  const [fragmentError, setFragmentError] = useState<string | null>(null)

  // Load Minecraft font
  useEffect(() => {
    const font = new FontFace('Minecraft', 'url(/fonts/Minecraft-Seven_v2.woff2)')
    font.load().then((loadedFont) => {
      document.fonts.add(loadedFont)
      setFontLoaded(true)
    }).catch(() => {
      setFontLoaded(true)
    })
  }, [])

  // Handle fullscreen - let the event handler update state
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [isFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Compile vertex shader
  const compileVertex = useCallback(() => {
    if (!vertexCode.trim()) {
      setVertexStatus('empty')
      setVertexError(null)
      setCompiledVertex({ posX: null, posY: null, color: null, alpha: null })
      return
    }
    setVertexStatus('compiling')
    try {
      const parsed = parseGLSL(vertexCode)
      const hasEffect = parsed.posX || parsed.posY
      if (!hasEffect) {
        const cleanCode = vertexCode.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
        if (cleanCode.length > 0) {
          setVertexError('Use: pos.x += ... or pos.y += ...')
          setVertexStatus('error')
        } else {
          setVertexError(null)
          setVertexStatus('empty')
        }
      } else {
        setVertexError(null)
        setVertexStatus('valid')
      }
      setCompiledVertex(parsed)
    } catch (e) {
      setVertexError(e instanceof Error ? e.message : 'Compilation failed')
      setVertexStatus('error')
    }
  }, [vertexCode])

  // Compile fragment shader
  const compileFragment = useCallback(() => {
    if (!fragmentCode.trim()) {
      setFragmentStatus('empty')
      setFragmentError(null)
      setCompiledFragment({ posX: null, posY: null, color: null, alpha: null })
      return
    }
    setFragmentStatus('compiling')
    try {
      const parsed = parseGLSL(fragmentCode)
      const hasEffect = parsed.color || parsed.alpha
      if (!hasEffect) {
        const cleanCode = fragmentCode.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
        if (cleanCode.length > 0) {
          setFragmentError('Use: texColor.rgb = ... or texColor.a *= ...')
          setFragmentStatus('error')
        } else {
          setFragmentError(null)
          setFragmentStatus('empty')
        }
      } else {
        setFragmentError(null)
        setFragmentStatus('valid')
      }
      setCompiledFragment(parsed)
    } catch (e) {
      setFragmentError(e instanceof Error ? e.message : 'Compilation failed')
      setFragmentStatus('error')
    }
  }, [fragmentCode])

  // Auto-compile on code change (debounced)
  useEffect(() => {
    setVertexStatus('compiling')
    const timeout = setTimeout(() => compileVertex(), 300)
    return () => clearTimeout(timeout)
  }, [vertexCode, compileVertex])

  useEffect(() => {
    setFragmentStatus('compiling')
    const timeout = setTimeout(() => compileFragment(), 300)
    return () => clearTimeout(timeout)
  }, [fragmentCode, compileFragment])

  // Handle Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        compileVertex()
        compileFragment()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [compileVertex, compileFragment])

  // Render loop with dynamic shader evaluation
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const time = (Date.now() - startTimeRef.current) / 1000
    const currentFontSize = isFullscreen ? 48 : fontSize
    ctx.font = `${currentFontSize}px Minecraft, monospace`
    const padding = compact ? 12 : 20

    const chars = sampleText.split('')
    let totalWidth = 0
    const charWidths: number[] = []
    for (const char of chars) {
      const width = ctx.measureText(char).width
      charWidths.push(width)
      totalWidth += width
    }

    const canvasWidth = isFullscreen ? window.innerWidth : Math.max(200, totalWidth + padding * 2)
    const canvasHeight = isFullscreen ? 200 : currentFontSize * 1.8 + padding * 2

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = `${currentFontSize}px Minecraft, monospace`
    ctx.textBaseline = 'middle'
    ctx.imageSmoothingEnabled = false

    const startX = isFullscreen ? (canvas.width - totalWidth) / 2 : padding
    let x = startX
    const y = canvas.height / 2
    const amplitudeScale = currentFontSize * 0.3

    // Apply compiled shaders to each character
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      const vars: GLSLVars = {
        charIndex: i,
        timeSeconds: time,
        speed,
        param,
      }

      // Calculate intermediate values
      vars.phase = i * 0.6 + time * speed * 2.0
      vars.amplitude = Math.max(1, param) * 0.15
      vars.seed = i + Math.floor(time * speed * 8.0)
      vars.pulse = (Math.sin(time * speed * 0.5 + i * 0.3) + 1) * 0.5
      vars.breath = (Math.sin(time * speed * 0.3) + 1) * 0.03 + 0.97

      let offsetX = 0
      let offsetY = 0
      let color = textColor
      let alpha = 1

      // Apply vertex shader (position)
      if (compiledVertex.posX) {
        try { offsetX = compiledVertex.posX(vars) * amplitudeScale } catch { /* ignore */ }
      }
      if (compiledVertex.posY) {
        try { offsetY = compiledVertex.posY(vars) * amplitudeScale } catch { /* ignore */ }
      }

      // Apply fragment shader (color/alpha)
      if (compiledFragment.color) {
        try {
          const rgb = compiledFragment.color(vars)
          if (rgb) color = `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`
        } catch { /* ignore */ }
      }
      if (compiledFragment.alpha) {
        try { alpha = compiledFragment.alpha(vars) } catch { /* ignore */ }
      }

      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.fillText(char, x + offsetX, y + offsetY)
      ctx.globalAlpha = 1

      x += charWidths[i]
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(render)
    }
  }, [compiledVertex, compiledFragment, sampleText, speed, param, textColor, bgColor, fontSize, isPlaying, compact, isFullscreen])

  useEffect(() => {
    if (!fontLoaded) return

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(render)
    } else {
      render()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [fontLoaded, isPlaying, render])

  const handleTemplateChange = (template: EffectKey) => {
    setSelectedTemplate(template)
    setVertexCode(EFFECT_TEMPLATES[template].vertexGlsl || '')
    setFragmentCode(EFFECT_TEMPLATES[template].fragmentGlsl || '')
  }

  const resetTime = () => {
    startTimeRef.current = Date.now()
  }

  const resetCode = () => {
    setVertexCode(EFFECT_TEMPLATES[selectedTemplate].vertexGlsl || '')
    setFragmentCode(EFFECT_TEMPLATES[selectedTemplate].fragmentGlsl || '')
  }

  const copyCode = () => {
    const code = [
      vertexCode ? `// VERTEX SHADER\n${vertexCode}` : null,
      fragmentCode ? `// FRAGMENT SHADER\n${fragmentCode}` : null,
    ].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const effect = EFFECT_TEMPLATES[selectedTemplate]
  const hasVertex = effect.vertexGlsl !== null
  const hasFragment = effect.fragmentGlsl !== null

  if (compact) {
    return (
      <div style={{
        border: '1px solid var(--nextra-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--nextra-bg)',
      }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--nextra-border)',
          backgroundColor: 'var(--nextra-code-bg)',
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          {Object.entries(EFFECT_TEMPLATES).map(([key, template]) => (
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
            <input type="range" min="1" max="7" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} style={{ width: '60px' }} />
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

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid var(--nextra-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '24px',
        marginBottom: '24px',
        backgroundColor: isFullscreen ? bgColor : 'var(--nextra-code-bg)',
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
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--nextra-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        backgroundColor: 'var(--nextra-bg)',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>✨</span> Shader Preview
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '11px', opacity: 0.6 }}>
            Edit vertex &amp; fragment shaders in real-time
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
      </div>

      {/* Template Selection */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--nextra-border)',
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
              {template.vertexGlsl && template.fragmentGlsl && <span style={{ opacity: 0.5, marginLeft: '4px' }}>V+F</span>}
              {template.vertexGlsl && !template.fragmentGlsl && <span style={{ opacity: 0.5, marginLeft: '4px' }}>V</span>}
              {!template.vertexGlsl && template.fragmentGlsl && <span style={{ opacity: 0.5, marginLeft: '4px' }}>F</span>}
            </button>
          ))}
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.5 }}>
          <strong>{effect.name}</strong>: {effect.description}
        </div>
      </div>

      {/* Preview Canvas */}
      <div style={{
        padding: isFullscreen ? '32px' : '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: isFullscreen ? '200px' : '100px',
        backgroundColor: bgColor,
        flex: isFullscreen ? 1 : undefined,
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
        backgroundColor: 'var(--nextra-bg)',
        borderBottom: '1px solid var(--nextra-border)',
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

      {/* Editable GLSL Code - Side by Side */}
      {showCode && (
        <div>
          <div style={{
            padding: '6px 16px',
            backgroundColor: 'var(--nextra-bg)',
            borderBottom: '1px solid var(--nextra-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>
              GLSL SHADERS
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={copyCode}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--nextra-border)',
                  backgroundColor: copied ? 'var(--nextra-primary-alpha)' : 'transparent',
                  color: 'var(--nextra-fg)',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copied' : 'Copy All'}
              </button>
              <button
                onClick={resetCode}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--nextra-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--nextra-fg)',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <CodeEditor
              label="VERTEX SHADER (position)"
              code={vertexCode}
              onChange={setVertexCode}
              placeholder="// pos.x += ...; pos.y += ...;"
              status={vertexCode.trim() ? vertexStatus : 'empty'}
              error={vertexError}
            />
            <div style={{ width: '1px', backgroundColor: 'var(--nextra-border)' }} />
            <CodeEditor
              label="FRAGMENT SHADER (color)"
              code={fragmentCode}
              onChange={setFragmentCode}
              placeholder="// texColor.rgb = ...; texColor.a *= ...;"
              status={fragmentCode.trim() ? fragmentStatus : 'empty'}
              error={fragmentError}
            />
          </div>
        </div>
      )}

      {/* Footer tip */}
      <div style={{
        padding: '8px 16px',
        fontSize: '10px',
        opacity: 0.5,
      }}>
        <strong>Tip:</strong> Edit both shaders above - vertex controls position (pos.x/y), fragment controls color (texColor.rgb/a). Changes apply in real-time.
      </div>
    </div>
  )
}

export { EFFECT_TEMPLATES }
export type { EffectKey }
