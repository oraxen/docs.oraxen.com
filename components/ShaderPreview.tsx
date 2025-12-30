'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// Built-in effect templates matching Oraxen's GLSL shaders
const EFFECT_TEMPLATES = {
  rainbow: {
    name: 'Rainbow',
    description: 'Cycles through rainbow colors based on position and time',
    glsl: `// Rainbow effect - cycles through HSV color wheel
vec3 rainbow(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float hue = fract(pos.x * 0.5 + timeSeconds * speed * 0.2);

    // HSV to RGB conversion
    vec3 rgb = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);

    // Preserve text luminance while adding color
    float lum = dot(texColor, vec3(0.299, 0.587, 0.114));
    return rgb * lum * 1.5;
}`,
  },
  wave: {
    name: 'Wave',
    description: 'Vertical sine wave motion',
    glsl: `// Wave effect - vertical oscillation
vec3 wave(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    // Note: Actual position offset happens in vertex shader
    // This simulates the visual by shifting color based on wave
    float wave = sin(charIndex * 0.5 + timeSeconds * speed * 2.0) * 0.5 + 0.5;
    float brightness = 0.8 + wave * 0.4;
    return texColor * brightness;
}`,
  },
  shake: {
    name: 'Shake',
    description: 'Random jitter effect',
    glsl: `// Shake effect - random jitter
vec3 shake(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    // Pseudo-random based on time and position
    float shake = fract(sin(charIndex * 12.9898 + floor(timeSeconds * speed * 10.0) * 78.233) * 43758.5453);
    float brightness = 0.9 + shake * 0.2;
    return texColor * brightness;
}`,
  },
  pulse: {
    name: 'Pulse',
    description: 'Opacity fades in and out',
    glsl: `// Pulse effect - opacity oscillation
vec3 pulse(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float pulse = sin(timeSeconds * speed * 2.0) * 0.5 + 0.5;
    float minAlpha = float(param) / 7.0 * 0.5;
    float alpha = mix(minAlpha, 1.0, pulse);
    return texColor * alpha;
}`,
  },
  gradient: {
    name: 'Gradient',
    description: 'Static color gradient across text',
    glsl: `// Gradient effect - horizontal color shift
vec3 gradient(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    vec3 startColor = vec3(1.0, 0.3, 0.3);  // Red
    vec3 endColor = vec3(0.3, 0.3, 1.0);    // Blue
    vec3 gradientColor = mix(startColor, endColor, pos.x);
    float lum = dot(texColor, vec3(0.299, 0.587, 0.114));
    return gradientColor * lum * 1.5;
}`,
  },
  typewriter: {
    name: 'Typewriter',
    description: 'Characters appear sequentially',
    glsl: `// Typewriter effect - sequential reveal
vec3 typewriter(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float revealIndex = floor(timeSeconds * speed * 4.0);
    float visible = step(charIndex, revealIndex);
    return texColor * visible;
}`,
  },
  breathing: {
    name: 'Breathing',
    description: 'Slow, smooth pulsing like breathing',
    glsl: `// Breathing effect - slow smooth pulse
vec3 breathing(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float breath = sin(timeSeconds * speed * 0.5) * 0.5 + 0.5;
    breath = breath * breath; // Ease in-out
    float brightness = 0.5 + breath * 0.5;
    return texColor * brightness;
}`,
  },
  glitch: {
    name: 'Glitch',
    description: 'Digital glitch/corruption effect',
    glsl: `// Glitch effect - digital corruption
vec3 glitch(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float t = floor(timeSeconds * speed * 5.0);
    float rand = fract(sin(t * 12.9898 + charIndex * 78.233) * 43758.5453);

    // Occasional color channel shift
    if (rand > 0.9) {
        return vec3(texColor.g, texColor.b, texColor.r);
    }
    // Occasional brightness spike
    if (rand > 0.85) {
        return texColor * 1.5;
    }
    return texColor;
}`,
  },
  colorShift: {
    name: 'Color Shift',
    description: 'Hue rotation over time',
    glsl: `// Color shift - rotating hue
vec3 colorShift(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float angle = timeSeconds * speed * 0.5;

    // RGB to approximate hue shift using rotation matrix
    float c = cos(angle);
    float s = sin(angle);
    mat3 hueRotate = mat3(
        0.299 + 0.701*c - 0.299*s,  0.587 - 0.587*c - 0.587*s,  0.114 - 0.114*c + 0.886*s,
        0.299 - 0.299*c + 0.143*s,  0.587 + 0.413*c + 0.140*s,  0.114 - 0.114*c - 0.283*s,
        0.299 - 0.299*c - 0.701*s,  0.587 - 0.587*c + 0.587*s,  0.114 + 0.886*c + 0.114*s
    );
    return hueRotate * texColor;
}`,
  },
  fadeIn: {
    name: 'Fade In',
    description: 'Characters fade in from transparent',
    glsl: `// Fade in effect - gradual appearance
vec3 fadeIn(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    float delay = charIndex * 0.1;
    float alpha = clamp((timeSeconds * speed - delay) * 2.0, 0.0, 1.0);
    return texColor * alpha;
}`,
  },
  custom: {
    name: 'Custom',
    description: 'Write your own shader code',
    glsl: `// Custom effect - modify this code!
vec3 customEffect(float timeSeconds, float speed, float param, float charIndex, vec2 pos, vec3 texColor) {
    // Available variables:
    // - timeSeconds: elapsed time in seconds
    // - speed: speed parameter (1-7)
    // - param: extra parameter (0-7)
    // - charIndex: character position in string (0, 1, 2, ...)
    // - pos: normalized position (0-1 for x and y)
    // - texColor: original text color (RGB)

    // Example: simple color cycle
    float hue = fract(timeSeconds * speed * 0.1);
    vec3 color = vec3(
        sin(hue * 6.28) * 0.5 + 0.5,
        sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
        sin(hue * 6.28 + 4.18) * 0.5 + 0.5
    );
    return color * length(texColor);
}`,
  },
}

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
varying vec2 v_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
    v_position = a_texCoord;
}
`

function createFragmentShader(effectCode: string): string {
  return `
precision mediump float;

varying vec2 v_texCoord;
varying vec2 v_position;

uniform sampler2D u_texture;
uniform float u_time;
uniform float u_speed;
uniform float u_param;
uniform vec2 u_resolution;
uniform float u_charCount;

${effectCode}

void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);

    if (texColor.a < 0.1) {
        discard;
    }

    // Simulate character index based on x position
    float charIndex = floor(v_position.x * u_charCount);

    // Get function name from the code (assumes first function defined)
    vec3 result = ${getEffectFunctionName(effectCode)}(u_time, u_speed, u_param, charIndex, v_position, texColor.rgb);

    gl_FragColor = vec4(result, texColor.a);
}
`
}

function getEffectFunctionName(code: string): string {
  // Extract function name from GLSL code
  const match = code.match(/vec3\s+(\w+)\s*\(/)
  return match ? match[1] : 'customEffect'
}

interface ShaderPreviewProps {
  initialTemplate?: keyof typeof EFFECT_TEMPLATES
}

export default function ShaderPreview({ initialTemplate = 'rainbow' }: ShaderPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textCanvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof EFFECT_TEMPLATES>(initialTemplate)
  const [glslCode, setGlslCode] = useState(EFFECT_TEMPLATES[initialTemplate].glsl)
  const [sampleText, setSampleText] = useState('Hello Oraxen!')
  const [speed, setSpeed] = useState(3)
  const [param, setParam] = useState(3)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [fontSize, setFontSize] = useState(32)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [fontLoaded, setFontLoaded] = useState(false)
  const [showCode, setShowCode] = useState(true)

  // Load Minecraft font
  useEffect(() => {
    const font = new FontFace('Minecraft', 'url(/fonts/Minecraft-Seven_v2.woff2)')
    font
      .load()
      .then((loadedFont) => {
        document.fonts.add(loadedFont)
        setFontLoaded(true)
      })
      .catch(() => {
        // Fallback to monospace if font fails to load
        setFontLoaded(true)
      })
  }, [])

  // Create text texture
  const createTextTexture = useCallback(() => {
    const textCanvas = textCanvasRef.current
    if (!textCanvas) return null

    const ctx = textCanvas.getContext('2d')
    if (!ctx) return null

    const padding = 20
    ctx.font = `${fontSize}px Minecraft, monospace`
    const metrics = ctx.measureText(sampleText)
    const textWidth = metrics.width + padding * 2
    const textHeight = fontSize * 1.5 + padding * 2

    textCanvas.width = Math.max(256, Math.ceil(textWidth))
    textCanvas.height = Math.max(64, Math.ceil(textHeight))

    // Clear and set background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height)

    // Draw text
    ctx.font = `${fontSize}px Minecraft, monospace`
    ctx.fillStyle = textColor
    ctx.textBaseline = 'middle'
    ctx.imageSmoothingEnabled = false
    ctx.fillText(sampleText, padding, textCanvas.height / 2)

    return textCanvas
  }, [sampleText, fontSize, textColor, bgColor])

  // Initialize WebGL
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) {
      setError('WebGL not supported in your browser')
      return false
    }

    glRef.current = gl
    return true
  }, [])

  // Compile shader program
  const compileProgram = useCallback(() => {
    const gl = glRef.current
    if (!gl) return false

    // Clean up old program
    if (programRef.current) {
      gl.deleteProgram(programRef.current)
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return false

    gl.shaderSource(vertexShader, VERTEX_SHADER)
    gl.compileShader(vertexShader)

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      setError('Vertex shader error: ' + gl.getShaderInfoLog(vertexShader))
      return false
    }

    const fragmentSource = createFragmentShader(glslCode)
    gl.shaderSource(fragmentShader, fragmentSource)
    gl.compileShader(fragmentShader)

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const errorLog = gl.getShaderInfoLog(fragmentShader) || 'Unknown error'
      setError('Fragment shader error: ' + errorLog)
      return false
    }

    const program = gl.createProgram()
    if (!program) return false

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setError('Program link error: ' + gl.getProgramInfoLog(program))
      return false
    }

    programRef.current = program
    setError(null)
    return true
  }, [glslCode])

  // Setup geometry and texture
  const setupScene = useCallback(() => {
    const gl = glRef.current
    const program = programRef.current
    if (!gl || !program) return

    gl.useProgram(program)

    // Create quad vertices
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])

    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0])

    // Position buffer
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const positionLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    // TexCoord buffer
    const texCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord')
    gl.enableVertexAttribArray(texCoordLoc)
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)

    // Create texture from text canvas
    const textCanvas = createTextTexture()
    if (!textCanvas) return

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    // Update canvas size to match text
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = textCanvas.width
      canvas.height = textCanvas.height
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
  }, [createTextTexture])

  // Render frame
  const render = useCallback(() => {
    const gl = glRef.current
    const program = programRef.current
    if (!gl || !program) return

    const time = (Date.now() - startTimeRef.current) / 1000

    // Update uniforms
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time)
    gl.uniform1f(gl.getUniformLocation(program, 'u_speed'), speed)
    gl.uniform1f(gl.getUniformLocation(program, 'u_param'), param)
    gl.uniform1f(gl.getUniformLocation(program, 'u_charCount'), sampleText.length)

    const canvas = canvasRef.current
    if (canvas) {
      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
    }

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(render)
    }
  }, [speed, param, sampleText, isPlaying])

  // Initialize and run
  useEffect(() => {
    if (!fontLoaded) return

    if (!glRef.current) {
      if (!initWebGL()) return
    }

    if (compileProgram()) {
      setupScene()
      startTimeRef.current = Date.now()
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(render)
      } else {
        render()
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [fontLoaded, initWebGL, compileProgram, setupScene, render, isPlaying])

  // Re-setup scene when text/colors change
  useEffect(() => {
    if (glRef.current && programRef.current) {
      setupScene()
    }
  }, [sampleText, fontSize, textColor, bgColor, setupScene])

  // Handle template change
  const handleTemplateChange = (template: keyof typeof EFFECT_TEMPLATES) => {
    setSelectedTemplate(template)
    setGlslCode(EFFECT_TEMPLATES[template].glsl)
  }

  // Reset time
  const resetTime = () => {
    startTimeRef.current = Date.now()
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--nextra-border)',
    backgroundColor: 'var(--nextra-bg)',
    color: 'var(--nextra-fg)',
    fontSize: '13px',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: 600,
    fontSize: '11px',
    color: 'var(--nextra-fg)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    opacity: 0.7,
  }

  return (
    <div
      style={{
        border: '1px solid var(--nextra-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginTop: '20px',
        marginBottom: '20px',
        backgroundColor: 'var(--nextra-bg)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--nextra-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Shader Preview</h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.6 }}>
            Test GLSL text effects with live preview
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCode(!showCode)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: showCode ? 'var(--nextra-primary-alpha)' : 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={resetTime}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--nextra-border)',
              backgroundColor: 'transparent',
              color: 'var(--nextra-fg)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Template Selection */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--nextra-border)',
          backgroundColor: 'var(--nextra-code-bg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          {Object.entries(EFFECT_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateChange(key as keyof typeof EFFECT_TEMPLATES)}
              title={template.description}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border:
                  selectedTemplate === key
                    ? '2px solid var(--nextra-primary)'
                    : '1px solid var(--nextra-border)',
                backgroundColor: selectedTemplate === key ? 'var(--nextra-primary-alpha)' : 'transparent',
                color: 'var(--nextra-fg)',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: selectedTemplate === key ? 600 : 400,
              }}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Preview Canvas */}
        <div
          style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '120px',
            backgroundColor: bgColor,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              imageRendering: 'pixelated',
              borderRadius: '4px',
            }}
          />
          {/* Hidden canvas for text rendering */}
          <canvas ref={textCanvasRef} style={{ display: 'none' }} />
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderTop: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--nextra-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label style={labelStyle}>Sample Text</label>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Speed (1-7)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="1"
                max="7"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600 }}>{speed}</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Param (0-7)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="0"
                max="7"
                value={param}
                onChange={(e) => setParam(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600 }}>{param}</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Font Size</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="range"
                min="16"
                max="64"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600 }}>{fontSize}px</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Text Color</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{
                  width: '36px',
                  height: '36px',
                  padding: 0,
                  border: '2px solid var(--nextra-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Background</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{
                  width: '36px',
                  height: '36px',
                  padding: 0,
                  border: '2px solid var(--nextra-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Code Editor */}
        {showCode && (
          <div
            style={{
              borderTop: '1px solid var(--nextra-border)',
            }}
          >
            <div
              style={{
                padding: '8px 20px',
                backgroundColor: 'var(--nextra-code-bg)',
                borderBottom: '1px solid var(--nextra-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>GLSL CODE</span>
              <span style={{ fontSize: '11px', opacity: 0.5 }}>
                Edit the shader code below to customize the effect
              </span>
            </div>
            <textarea
              value={glslCode}
              onChange={(e) => setGlslCode(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '16px 20px',
                border: 'none',
                backgroundColor: 'var(--nextra-code-bg)',
                color: 'var(--nextra-fg)',
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Footer with tips */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--nextra-border)',
          backgroundColor: 'var(--nextra-code-bg)',
          fontSize: '11px',
          opacity: 0.6,
        }}
      >
        <strong>Tip:</strong> Your shader function receives{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
          timeSeconds
        </code>
        ,{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
          speed
        </code>
        ,{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
          param
        </code>
        ,{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
          charIndex
        </code>
        ,{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
          pos
        </code>
        , and{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
          texColor
        </code>{' '}
        as inputs. Return a{' '}
        <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '3px' }}>vec3</code>{' '}
        RGB color.
      </div>
    </div>
  )
}
