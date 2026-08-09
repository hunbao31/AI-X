import type { MascotExpression } from '@/components/mascot/expressions';

// Preset avatar catalog — mirrors backend/src/users/avatars.ts. Every id
// renders from /public/avatars/<id>.png when that file exists, otherwise
// from the built-in vector Koaly with the mapped expression, so the feature
// ships before any artwork is cropped.

export interface AvatarPreset {
  id: string;
  label: string;
  expression: MascotExpression;
  // Background tint behind the face — gives each preset its own identity.
  bg: string;
}

export const AVATARS: AvatarPreset[] = [
  { id: 'koaly_default', label: 'Cổ điển', expression: 'excited', bg: 'bg-indigo-500/25' },
  { id: 'koaly_happy', label: 'Vui vẻ', expression: 'awesome', bg: 'bg-amber-500/25' },
  { id: 'koaly_cool', label: 'Ngầu', expression: 'cool', bg: 'bg-slate-500/25' },
  { id: 'koaly_smart', label: 'Thông minh', expression: 'gotit', bg: 'bg-emerald-500/25' },
  { id: 'koaly_sleepy', label: 'Buồn ngủ', expression: 'sleepy', bg: 'bg-purple-500/25' },
  { id: 'koaly_proud', label: 'Tự hào', expression: 'proud', bg: 'bg-orange-500/25' },
  { id: 'koaly_love', label: 'Đáng yêu', expression: 'love', bg: 'bg-pink-500/25' },
  { id: 'koaly_determined', label: 'Nhiệt huyết', expression: 'determined', bg: 'bg-red-500/25' },
  { id: 'koaly_curious', label: 'Tò mò', expression: 'curious', bg: 'bg-sky-500/25' },
  { id: 'koaly_surprised', label: 'Ngạc nhiên', expression: 'surprised', bg: 'bg-fuchsia-500/25' },
];

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export function avatarPreset(id: string | null | undefined): AvatarPreset {
  return (id && BY_ID.get(id)) || AVATARS[0];
}
