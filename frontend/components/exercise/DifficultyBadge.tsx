import { Badge } from '../ui/Badge';

const TONE = { easy: 'green', medium: 'yellow', hard: 'red' } as const;

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  return <Badge tone={TONE[difficulty]}>{difficulty}</Badge>;
}
