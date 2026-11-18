import React, {useEffect, useId, useRef, useState} from 'react';
import CodeBlock from '@theme/CodeBlock';
import styles from './styles.module.css';

const MAX_HEIGHT = 4096;
const MAX_CHEST_ROWS = 6;
const PANEL_BASE_HEIGHT = 114;
const PREVIEW_HEIGHT = PANEL_BASE_HEIGHT + MAX_CHEST_ROWS * 18 + 64;
const constrainPosition = ({x, y}) => ({
  x: Math.max(-2039, Math.min(2055, x)),
  y: Math.max(-4083, Math.min(4109, y)),
});

function SelectField({label, value, values, format, onChange}) {
  const id = useId();
  const root = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {if (!root.current?.contains(event.target)) setOpen(false);};
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div className={styles.field} ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <span id={id}>{label}</span>
    <div className={styles.select}>
      <button type="button" role="combobox" aria-labelledby={id + " " + id + "-value"} aria-expanded={open}
        aria-haspopup="listbox" aria-controls={id + '-list'}
        aria-activedescendant={open ? id + '-' + active : undefined}
        className={styles.selectTrigger} onClick={() => {setActive(value); setOpen(!open);}}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Tab') {setOpen(false); return;}
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (open) {onChange(active); setOpen(false);}
            else {setActive(value); setOpen(true);}
            return;
          }
          if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const index = values.indexOf(open ? active : value);
          setActive(event.key === 'Home' ? values[0] : event.key === 'End' ? values[values.length - 1]
            : values[Math.max(0, Math.min(values.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]);
          setOpen(true);
        }}>
        <span id={id + "-value"}>{format(value)}</span><svg className={styles.chevron} data-open={open} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      <div id={id + '-list'} role="listbox" aria-labelledby={id} hidden={!open} className={styles.selectMenu}>
        {values.map((option) => <div key={option} id={id + '-' + option} role="option"
          aria-selected={value === option} data-active={active === option} className={styles.selectOption}
          onPointerMove={() => setActive(option)} onMouseDown={(event) => event.preventDefault()}
          onClick={() => {onChange(option); setOpen(false); root.current.querySelector('button').focus();}}>
          {format(option)}<svg className={styles.optionCheck} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">{value === option && <path d="m3 8 3 3 7-7" />}</svg>
        </div>)}
      </div>
    </div>
  </div>;
}

function NumberField({label, value, onChange, min, max}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  return <label className={styles.field}>{label}
    <input type="number" value={editing ? draft : value} min={min} max={max} step="1"
      onFocus={() => {setDraft(String(value)); setEditing(true);}}
      onBlur={() => setEditing(false)}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value === '') return;
        const number = Number(event.target.value);
        if (Number.isFinite(number)) onChange(Math.min(max, Math.max(min, Math.round(number))));
      }} />
  </label>;
}

const OPACITY_STOPS = [0, 25, 50, 75, 100];
const SLIDER_THUMB_RADIUS = 8;

function Slider({value, onChange, color, stops = [], min = 0, max = 100, valueText = `${value}%`}) {
  const drag = useRef(null);
  const toPercent = (point) => (point - min) / (max - min) * 100;
  const progress = toPercent(value);

  function move(event, offset) {
    const {left, width} = event.currentTarget.getBoundingClientRect();
    const travel = width - 2 * SLIDER_THUMB_RADIUS;
    if (travel <= 0) return;
    const position = event.clientX - left - SLIDER_THUMB_RADIUS - offset;
    const percent = Math.max(0, Math.min(100, position / travel * 100));
    const stop = stops.find((point) => Math.abs(toPercent(point) - percent) <= Math.min(4, 5 / travel * 100));
    onChange(stop ?? Math.round(min + percent / 100 * (max - min)));
  }

  return <span className={styles.sliderTrack} style={{
    '--slider-value': `${progress}%`,
    '--slider-offset': `${SLIDER_THUMB_RADIUS * (1 - progress / 50)}px`,
    '--slider-color': color,
  }}>
    <span className={styles.sliderTicks} aria-hidden="true">
      {stops.map((stop) => <span key={stop} style={{insetInlineStart: `${toPercent(stop)}%`}} />)}
    </span>
    <input className={styles.slider} type="range" min={min} max={max} step={1} value={value} aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return;
        event.preventDefault();
        const input = event.currentTarget;
        input.dataset.pointerFocus = 'true';
        input.focus({preventScroll: true});
        input.setPointerCapture(event.pointerId);
        const {left, width} = input.getBoundingClientRect();
        const center = left + SLIDER_THUMB_RADIUS + (width - 2 * SLIDER_THUMB_RADIUS) * progress / 100;
        const distance = event.clientX - center;
        const onThumb = Math.abs(distance) <= SLIDER_THUMB_RADIUS;
        drag.current = {id: event.pointerId, offset: onThumb ? distance : 0};
        if (!onThumb) move(event, 0);
      }}
      onPointerMove={(event) => {
        if (drag.current?.id === event.pointerId) move(event, drag.current.offset);
      }}
      onKeyDown={(event) => {delete event.currentTarget.dataset.pointerFocus;}}
      onBlur={(event) => {delete event.currentTarget.dataset.pointerFocus;}}
      onLostPointerCapture={(event) => {
        if (drag.current?.id === event.pointerId) drag.current = null;
      }} />
  </span>;
}

export default function GuiVisualizer() {
  const [texture, setTexture] = useState(null);
  const [rows, setRows] = useState(6);
  const [height, setHeight] = useState(256);
  const [position, setPosition] = useState({x: 0, y: 0});
  const [zoom, setZoom] = useState(3);
  const [opacity, setOpacity] = useState(80);
  const [grid, setGrid] = useState(true);
  const [glyph, setGlyph] = useState('my_custom_gui');
  const [path, setPath] = useState('gui/my_menu_texture');
  const [error, setError] = useState('');
  const loadId = useRef(0);
  const drag = useRef(null);
  const svg = useRef(null);
  const panelHeight = PANEL_BASE_HEIGHT + rows * 18;
  const inventoryY = rows * 18 + 31;
  const ascent = 13 - position.y;
  const shift = position.x - 8;
  const width = texture ? height * texture.width / texture.height : 0;
  const validGlyph = /^[a-z0-9_]+$/.test(glyph);
  const validPath = /^[a-z0-9_./-]+$/.test(path) && !path.startsWith('/') && !path.split('/').includes('..');
  const valid = validGlyph && validPath && ascent <= height;
  const yaml = `${glyph}:\n  texture: ${JSON.stringify(path)}\n  ascent: ${ascent}\n  height: ${height}`;
  const title = `<white><shift:${shift}><glyph:${glyph}></white>`;

  async function loadTexture(file) {
    const id = ++loadId.current;
    setError('');
    if (!file || file.type !== 'image/png') {
      setError('Choose a PNG texture.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose a PNG smaller than 10 MB.');
      return;
    }
    try {
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = source;
      });
      if (id !== loadId.current) return;
      if (image.width > 4096 || image.height > 4096) {
        setError('Use a texture no larger than 4096 pixels on either side.');
        return;
      }
      setTexture({source, width: image.width, height: image.height, name: file.name});
      setHeight(image.height);
      setPosition({x: 0, y: 0});
    } catch {
      if (id === loadId.current) setError('This PNG could not be opened. Try another file.');
    }
  }

  function point(event) {
    const matrix = svg.current.getScreenCTM();
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }

  function slots(y, count, offset, numbers = false) {
    return Array.from({length: count * 9}, (_, index) => {
      const x = 7 + index % 9 * 18;
      const top = y + Math.floor(index / 9) * 18;
      if (numbers) return <text key={index} className={styles.slotNumber} x={x + 9} y={top + 9}
        textAnchor="middle" dominantBaseline="central">{offset + index}</text>;
      return <g key={index}>
        <rect x={x} y={top} width="18" height="18" fill="#555" />
        <path d={`M${x + 1} ${top + 17}h16v-16`} fill="none" stroke="#eee" />
        <rect x={x + 1} y={top + 1} width="16" height="16" fill="#999" />
      </g>;
    });
  }

  return <div className={styles.tool}>
    <div className={styles.preview} data-loaded={Boolean(texture)} onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {event.preventDefault(); loadTexture(event.dataTransfer.files[0]);}}>
      <div className={styles.toolbar}>
        <label className={styles.upload}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10V2m-3 3 3-3 3 3M2 10v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" />
          </svg>
          {texture ? 'Replace PNG' : 'Add PNG'}
          <input type="file" accept="image/png" onChange={(event) => {
            if (event.target.files[0]) loadTexture(event.target.files[0]);
            event.target.value = '';
          }} />
        </label>
        <SelectField label="Preview zoom" value={zoom} values={[1, 2, 3, 4]} format={(value) => value + "×"} onChange={setZoom} />
      </div>
      <svg ref={svg} className={styles.stage} width={240 * zoom} height={PREVIEW_HEIGHT * zoom}
        viewBox={`-32 -32 240 ${PREVIEW_HEIGHT}`} tabIndex={0} role="img"
        aria-label="GUI alignment preview. Drag to move the texture or use arrow keys. Hold Shift to move eight pixels."
        onPointerDown={(event) => {
          if (!texture || event.button !== 0) return;
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {point: point(event), position};
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const cursor = point(event);
          setPosition(constrainPosition({x: Math.round(drag.current.position.x + cursor.x - drag.current.point.x),
            y: Math.round(drag.current.position.y + cursor.y - drag.current.point.y)}));
        }}
        onPointerUp={() => {drag.current = null;}}
        onPointerCancel={() => {drag.current = null;}}
        onLostPointerCapture={() => {drag.current = null;}}
        onKeyDown={(event) => {
          const directions = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
          if (!texture || !directions[event.key]) return;
          event.preventDefault();
          const [dx, dy] = directions[event.key];
          const step = event.shiftKey ? 8 : 1;
          setPosition((current) => constrainPosition({x: current.x + dx * step, y: current.y + dy * step}));
        }}>
        <title>Chest inventory alignment</title>
        <rect width="176" height={panelHeight} rx="3" fill="#b8b8b8" stroke="#333" strokeWidth="2" />
        <path d={`M2 ${panelHeight - 3}V2h171`} fill="none" stroke="#eee" strokeWidth="2" />
        <text x="8" y="13" fontSize="8" fill="#444">Container</text>
        <text x="8" y={inventoryY - 6} fontSize="8" fill="#444">Inventory</text>
        {slots(17, rows, 0)}
        {slots(inventoryY, 3, rows * 9)}
        {slots(inventoryY + 58, 1, rows * 9 + 27)}
        {texture && <image href={texture.source} x={position.x} y={position.y} width={width} height={height} opacity={opacity / 100} />}
        {grid && <g pointerEvents="none">
          {slots(17, rows, 0, true)}
          {slots(inventoryY, 3, rows * 9, true)}
          {slots(inventoryY + 58, 1, rows * 9 + 27, true)}
        </g>}
      </svg>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.controls}>
      <fieldset><legend>Inventory and overlay</legend>
        <label className={styles.field}>
          <span className={styles.sliderLabel}>Chest rows <span aria-hidden="true">{rows}</span></span>
          <Slider value={rows} onChange={setRows} min={1} max={6} stops={[1, 2, 3, 4, 5, 6]}
            valueText={`${rows} ${rows === 1 ? 'row' : 'rows'}`} />
        </label>
        <label className={styles.field}>
          <span className={styles.sliderLabel}>Texture opacity <span aria-hidden="true">{opacity}%</span></span>
          <Slider value={opacity} onChange={setOpacity} stops={OPACITY_STOPS} />
        </label>
        <label className={styles.toggle}><input type="checkbox" checked={grid} onChange={(event) => setGrid(event.target.checked)} /> Show guides</label>
      </fieldset>
      <fieldset><legend>Glyph alignment</legend>
        <NumberField label="Glyph height" value={height} min={1} max={MAX_HEIGHT} onChange={setHeight} />
        <NumberField label="Title shift" value={shift} min={-2047} max={2047} onChange={(value) => setPosition((current) => ({...current, x: value + 8}))} />
        <NumberField label="Ascent" value={ascent} min={-4096} max={4096} onChange={(value) => setPosition((current) => ({...current, y: 13 - value}))} />
        <button type="button" onClick={() => {setPosition({x: 0, y: 0}); if (texture) setHeight(texture.height);}}>Reset alignment</button>
      </fieldset>
      <fieldset><legend>Oraxen configuration</legend>
        <label className={styles.field}>Glyph ID<input type="text" value={glyph} spellCheck={false} onChange={(event) => setGlyph(event.target.value)} /></label>
        <label className={styles.field}>Texture path<input type="text" value={path} spellCheck={false} onChange={(event) => setPath(event.target.value)} /></label>

      </fieldset>
    </div>
    {!validGlyph && <p role="alert" className={styles.error}>Use lowercase letters, numbers, and underscores for the glyph ID.</p>}
    {!validPath && <p role="alert" className={styles.error}>Use a relative texture path with lowercase letters, numbers, underscores, dots, hyphens, or slashes. Parent directory paths are not allowed.</p>}
    {ascent > height && <p role="alert" className={styles.error}>Minecraft requires ascent to be no greater than glyph height. Increase the height or move the texture down.</p>}
    {texture && valid ? <div className={styles.output}>
      <div><h3>Glyph settings</h3><CodeBlock language="yaml">{yaml}</CodeBlock></div>
      <div><h3>Menu title</h3><CodeBlock language="text">{title}</CodeBlock>
        <p className={styles.help}>Use this as the whole title. Additional text needs its own shift after the glyph.</p></div>
    </div> : texture ? <p className={styles.help}>Correct the fields above to generate the configuration.</p> : null}
  </div>;
}
