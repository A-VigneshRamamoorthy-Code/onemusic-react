import { useId, useMemo } from 'react';

// Warm, Apple Music–flavored gradient palettes (pinks, reds, corals, magentas).
const PALETTES = [
  ['#FB5C74', '#FA2D48', '#D5254E'],
  ['#FF375F', '#FF6482', '#FF9DAE'],
  ['#FF6A3D', '#FF3B6B', '#E11D48'],
  ['#FF2D55', '#F43F6B', '#A21CAF'],
  ['#F43F5E', '#EC4899', '#A855F7'],
  ['#FF7A59', '#FF4D6D', '#C9184A'],
  ['#FFB03A', '#FF5E5B', '#FA2D48'],
  ['#FF5E7E', '#E11D48', '#7A1030'],
];

const STYLE_COUNT = 5;

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || 'onemusic');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Standalone SVG data URL for the current track, used as Media Session lock-screen
// artwork (works where raster is not required; harmless where the platform ignores SVG).
function artworkDataUrl(seed) {
  const hash = hashString(seed);
  const colors = PALETTES[hash % PALETTES.length];
  const angle = (hash % 4) * 45;
  const svg = [
    "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'>",
    "<defs><linearGradient id='g' gradientTransform='rotate(" + angle + " 0.5 0.5)'>",
    "<stop offset='0%' stop-color='" + colors[0] + "'/>",
    "<stop offset='55%' stop-color='" + colors[1] + "'/>",
    "<stop offset='100%' stop-color='" + colors[2] + "'/>",
    '</linearGradient></defs>',
    "<rect width='512' height='512' fill='url(#g)'/>",
    "<g fill='#ffffff'>",
    "<rect x='300' y='150' width='26' height='200' rx='13'/>",
    "<path d='M326 150 C372 156 396 182 396 220 C384 196 356 186 326 196 Z'/>",
    "<ellipse cx='268' cy='352' rx='58' ry='44' transform='rotate(-18 268 352)'/>",
    '</g></svg>',
  ].join('');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function Vinyl({ colors, ids }) {
  const grooves = [42, 37, 32, 27, 22];
  return (
    <g>
      <rect width="100" height="100" fill={`url(#${ids.bg})`} />
      <circle cx="50" cy="50" r="47" fill="#0d0d12" />
      {grooves.map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
      ))}
      <circle cx="50" cy="50" r="15" fill={colors[0]} />
      <circle cx="50" cy="50" r="15" fill={`url(#${ids.label})`} />
      <circle cx="50" cy="50" r="2.4" fill="#0d0d12" />
      <path d="M30 26 A34 34 0 0 1 74 30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Equalizer({ colors, ids, random }) {
  const bars = Array.from({ length: 9 }, (_, index) => {
    const height = 24 + Math.floor(random() * 60);
    return { x: 8 + index * 10, height };
  });
  return (
    <g>
      <rect width="100" height="100" fill={`url(#${ids.bg})`} />
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={92 - bar.height}
          width="6.5"
          height={bar.height}
          rx="3"
          fill="rgba(255,255,255,0.85)"
          opacity={0.55 + (bar.height / 84) * 0.45}
        />
      ))}
      <circle cx="78" cy="22" r="10" fill={colors[2]} opacity="0.9" />
    </g>
  );
}

function Waveform({ ids, random }) {
  const bars = Array.from({ length: 15 }, (_, index) => {
    const amp = 8 + Math.floor(random() * 34);
    return { x: 6 + index * 6.2, amp };
  });
  return (
    <g>
      <rect width="100" height="100" fill={`url(#${ids.bg})`} />
      {bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={50 - bar.amp}
          width="3.4"
          height={bar.amp * 2}
          rx="1.7"
          fill="rgba(255,255,255,0.9)"
          opacity="0.9"
        />
      ))}
    </g>
  );
}

function Sunburst({ colors, ids }) {
  const rays = Array.from({ length: 24 }, (_, index) => index);
  return (
    <g>
      <rect width="100" height="100" fill={`url(#${ids.radial})`} />
      <g transform="translate(50 50)">
        {rays.map((index) => (
          <path
            key={index}
            d="M0 0 L6 -70 L-6 -70 Z"
            fill={index % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.04)'}
            transform={`rotate(${index * 15})`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="16" fill={colors[0]} />
      <circle cx="50" cy="50" r="16" fill={`url(#${ids.label})`} />
    </g>
  );
}

function NoteMesh({ colors, ids, random }) {
  const blobs = Array.from({ length: 4 }, () => ({
    cx: 12 + Math.floor(random() * 76),
    cy: 12 + Math.floor(random() * 76),
    r: 16 + Math.floor(random() * 22),
    fill: colors[Math.floor(random() * colors.length)],
  }));
  return (
    <g>
      <rect width="100" height="100" fill={`url(#${ids.bg})`} />
      <g filter={`url(#${ids.soft})`}>
        {blobs.map((blob, index) => (
          <circle key={index} cx={blob.cx} cy={blob.cy} r={blob.r} fill={blob.fill} opacity="0.55" />
        ))}
      </g>
      <g fill="#ffffff">
        <rect x="60" y="26" width="4.5" height="38" rx="2" />
        <path d="M64.5 26 C72 27 76 31 76 37 C74 33 70 31 64.5 33 Z" />
        <ellipse cx="55" cy="66" rx="11" ry="8" transform="rotate(-18 55 66)" />
      </g>
    </g>
  );
}

function AlbumArt({ seed, playing = false, spin = false, className = '' }) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const { colors, style, random } = useMemo(() => {
    const hash = hashString(seed);
    return {
      colors: PALETTES[hash % PALETTES.length],
      style: hash % STYLE_COUNT,
      random: makeRandom(hash),
    };
  }, [seed]);

  const ids = {
    bg: `${uid}-bg`,
    radial: `${uid}-radial`,
    label: `${uid}-label`,
    soft: `${uid}-soft`,
  };
  const angle = (hashString(seed) % 4) * 45;
  const spinning = spin && playing && style === 0;

  return (
    <svg
      className={`album-art ${spinning ? 'album-art--spin' : ''} ${className}`.trim()}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Generated album art"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={ids.bg} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="55%" stopColor={colors[1]} />
          <stop offset="100%" stopColor={colors[2]} />
        </linearGradient>
        <radialGradient id={ids.radial} cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor={colors[1]} />
          <stop offset="100%" stopColor={colors[2]} />
        </radialGradient>
        <linearGradient id={ids.label} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id={ids.soft} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      {style === 0 ? <Vinyl colors={colors} ids={ids} random={random} /> : null}
      {style === 1 ? <Equalizer colors={colors} ids={ids} random={random} /> : null}
      {style === 2 ? <Waveform colors={colors} ids={ids} random={random} /> : null}
      {style === 3 ? <Sunburst colors={colors} ids={ids} random={random} /> : null}
      {style === 4 ? <NoteMesh colors={colors} ids={ids} random={random} /> : null}
    </svg>
  );
}

export default AlbumArt;
export { artworkDataUrl };
