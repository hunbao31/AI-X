// Preset avatar catalog — the only values User.avatar may hold. The
// frontend renders these from /public/avatars/<id>.png with a built-in
// vector fallback, so adding a new preset here + one PNG is a full rollout.

export const AVATAR_IDS = [
  'koaly_default',
  'koaly_happy',
  'koaly_cool',
  'koaly_smart',
  'koaly_sleepy',
  'koaly_proud',
  'koaly_love',
  'koaly_determined',
  'koaly_curious',
  'koaly_surprised',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

export const DEFAULT_AVATAR: AvatarId = 'koaly_default';
