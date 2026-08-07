import { Badge } from '../ui/Badge';

const TONE = { easy: 'green', medium: 'yellow', hard: 'red' } as const;
const LABEL: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

export function DifficultyBadge({
  difficulty,
}: {
  difficulty: 'easy' | 'medium' | 'hard';
}) {
  return <Badge tone={TONE[difficulty]}>{LABEL[difficulty]}</Badge>;
}
