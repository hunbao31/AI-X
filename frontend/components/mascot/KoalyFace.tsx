import type { MascotExpression } from './expressions';

// Built-in vector Koaly — the fallback when a sprite PNG for an expression
// hasn't been dropped into /public/mascot yet. One parametric face keeps all
// 16 expressions in ~no bytes; the real artwork replaces it file-by-file.

type Eyes = 'open' | 'happy' | 'wink' | 'sleepy' | 'star' | 'heart' | 'wide' | 'cool';
type Mouth = 'smile' | 'grin' | 'o' | 'frown' | 'wavy' | 'flat';
type Extra = 'none' | 'sparkles' | 'question' | 'zzz' | 'bulb' | 'hearts' | 'sweat';

interface FaceConfig {
  eyes: Eyes;
  mouth: Mouth;
  extra: Extra;
  blush: boolean;
}

const FACES: Record<MascotExpression, FaceConfig> = {
  excited: { eyes: 'open', mouth: 'grin', extra: 'sparkles', blush: true },
  awesome: { eyes: 'wink', mouth: 'grin', extra: 'sparkles', blush: true },
  thinking: { eyes: 'open', mouth: 'flat', extra: 'none', blush: false },
  curious: { eyes: 'open', mouth: 'o', extra: 'question', blush: false },
  surprised: { eyes: 'wide', mouth: 'o', extra: 'sparkles', blush: false },
  proud: { eyes: 'happy', mouth: 'smile', extra: 'sparkles', blush: true },
  focused: { eyes: 'open', mouth: 'flat', extra: 'none', blush: false },
  determined: { eyes: 'open', mouth: 'grin', extra: 'sparkles', blush: false },
  confused: { eyes: 'open', mouth: 'wavy', extra: 'sweat', blush: false },
  cool: { eyes: 'cool', mouth: 'smile', extra: 'none', blush: false },
  sleepy: { eyes: 'sleepy', mouth: 'o', extra: 'zzz', blush: false },
  cheer: { eyes: 'happy', mouth: 'grin', extra: 'sparkles', blush: true },
  oops: { eyes: 'sleepy', mouth: 'frown', extra: 'sweat', blush: false },
  gotit: { eyes: 'happy', mouth: 'grin', extra: 'bulb', blush: true },
  love: { eyes: 'heart', mouth: 'grin', extra: 'hearts', blush: true },
  wave: { eyes: 'happy', mouth: 'grin', extra: 'none', blush: true },
};

// Palette lifted from the character sheet: warm yellows + deep navy + purple.
const FUR = '#F5D442';
const FUR_DARK = '#E3B92E';
const EAR_INNER = '#FBF3D8';
const NAVY = '#232544';
const PURPLE = '#8B7BD8';

function EyesShape({ kind }: { kind: Eyes }) {
  switch (kind) {
    case 'happy':
      return (
        <g stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M32 44 q6 -8 12 0" />
          <path d="M58 44 q6 -8 12 0" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="38" cy="44" r="6.5" fill={NAVY} />
          <circle cx="40" cy="42" r="2" fill="#fff" />
          <path d="M58 44 q6 -7 12 0" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'sleepy':
      return (
        <g stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M32 46 q6 4 12 0" />
          <path d="M58 46 q6 4 12 0" />
        </g>
      );
    case 'star':
      return (
        <g fill={PURPLE}>
          <path d="M38 37 l2.2 4.8 5.2.6 -3.9 3.5 1.1 5.1 -4.6 -2.7 -4.6 2.7 1.1 -5.1 -3.9 -3.5 5.2 -.6z" />
          <path d="M64 37 l2.2 4.8 5.2.6 -3.9 3.5 1.1 5.1 -4.6 -2.7 -4.6 2.7 1.1 -5.1 -3.9 -3.5 5.2 -.6z" />
        </g>
      );
    case 'heart':
      return (
        <g fill="#EF5777">
          <path d="M38 40 c-3 -4 -9 -2 -9 3 c0 4 5 7 9 10 c4 -3 9 -6 9 -10 c0 -5 -6 -7 -9 -3z" />
          <path d="M64 40 c-3 -4 -9 -2 -9 3 c0 4 5 7 9 10 c4 -3 9 -6 9 -10 c0 -5 -6 -7 -9 -3z" />
        </g>
      );
    case 'wide':
      return (
        <g>
          <circle cx="38" cy="44" r="8" fill="#fff" stroke={NAVY} strokeWidth="2" />
          <circle cx="38" cy="44" r="4.5" fill={NAVY} />
          <circle cx="64" cy="44" r="8" fill="#fff" stroke={NAVY} strokeWidth="2" />
          <circle cx="64" cy="44" r="4.5" fill={NAVY} />
        </g>
      );
    case 'cool':
      return (
        <g>
          <rect x="26" y="36" width="24" height="14" rx="6" fill={NAVY} />
          <rect x="52" y="36" width="24" height="14" rx="6" fill={NAVY} />
          <path d="M50 40 h2" stroke={NAVY} strokeWidth="4" />
        </g>
      );
    case 'open':
    default:
      return (
        <g>
          <circle cx="38" cy="44" r="6.5" fill={NAVY} />
          <circle cx="40" cy="42" r="2" fill="#fff" />
          <circle cx="64" cy="44" r="6.5" fill={NAVY} />
          <circle cx="66" cy="42" r="2" fill="#fff" />
        </g>
      );
  }
}

function MouthShape({ kind }: { kind: Mouth }) {
  switch (kind) {
    case 'grin':
      return <path d="M42 66 q9 10 18 0 z" fill={NAVY} />;
    case 'o':
      return <ellipse cx="51" cy="68" rx="5" ry="6" fill={NAVY} />;
    case 'frown':
      return <path d="M43 71 q8 -7 16 0" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />;
    case 'wavy':
      return <path d="M41 68 q4 -4 8 0 q4 4 8 0 q2 -2 4 -1" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />;
    case 'flat':
      return <path d="M44 68 h14" stroke={NAVY} strokeWidth="4" strokeLinecap="round" />;
    case 'smile':
    default:
      return <path d="M42 66 q9 8 18 0" stroke={NAVY} strokeWidth="4" strokeLinecap="round" fill="none" />;
  }
}

function ExtraShape({ kind }: { kind: Extra }) {
  switch (kind) {
    case 'sparkles':
      return (
        <g fill="#F6C445">
          <path d="M88 16 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <path d="M12 26 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" />
        </g>
      );
    case 'question':
      return (
        <text x="84" y="26" fontSize="24" fontWeight="bold" fill={PURPLE}>
          ?
        </text>
      );
    case 'zzz':
      return (
        <text x="76" y="22" fontSize="18" fontWeight="bold" fill={PURPLE}>
          zZ
        </text>
      );
    case 'bulb':
      return (
        <g>
          <circle cx="88" cy="18" r="8" fill="#FFE480" stroke="#F6C445" strokeWidth="2" />
          <rect x="85" y="26" width="6" height="4" rx="1" fill="#F6C445" />
        </g>
      );
    case 'hearts':
      return (
        <g fill="#EF5777">
          <path d="M88 14 c-2.5 -3.5 -8 -2 -8 2.5 c0 3.5 4.5 6 8 8.5 c3.5 -2.5 8 -5 8 -8.5 c0 -4.5 -5.5 -6 -8 -2.5z" />
          <path d="M12 20 c-1.8 -2.5 -5.6 -1.4 -5.6 1.8 c0 2.5 3.2 4.2 5.6 6 c2.4 -1.8 5.6 -3.5 5.6 -6 c0 -3.2 -3.8 -4.3 -5.6 -1.8z" />
        </g>
      );
    case 'sweat':
      return <path d="M86 34 q4 6 0 9 q-4 -3 0 -9z" fill="#7EC8F2" />;
    case 'none':
    default:
      return null;
  }
}

interface KoalyFaceProps {
  expression: MascotExpression;
  size: number;
}

export function KoalyFace({ expression, size }: KoalyFaceProps) {
  const face = FACES[expression];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 102 102"
      role="img"
      aria-label={`Koaly ${expression}`}
    >
      {/* ears */}
      <circle cx="16" cy="26" r="15" fill={FUR} stroke={FUR_DARK} strokeWidth="2" />
      <circle cx="16" cy="26" r="8" fill={EAR_INNER} />
      <circle cx="86" cy="26" r="15" fill={FUR} stroke={FUR_DARK} strokeWidth="2" />
      <circle cx="86" cy="26" r="8" fill={EAR_INNER} />
      {/* head */}
      <ellipse cx="51" cy="54" rx="38" ry="36" fill={FUR} stroke={FUR_DARK} strokeWidth="2" />
      {/* hoodie collar hint */}
      <path d="M18 86 q33 18 66 0 l0 16 -66 0z" fill={NAVY} />
      <EyesShape kind={face.eyes} />
      {/* nose */}
      <ellipse cx="51" cy="56" rx="9" ry="7.5" fill={NAVY} />
      <ellipse cx="48" cy="54" rx="2.5" ry="1.8" fill="#4A4C6E" />
      {face.blush && (
        <g fill="#F5A9A0" opacity="0.7">
          <ellipse cx="26" cy="58" rx="5" ry="3" />
          <ellipse cx="76" cy="58" rx="5" ry="3" />
        </g>
      )}
      <MouthShape kind={face.mouth} />
      <ExtraShape kind={face.extra} />
    </svg>
  );
}
