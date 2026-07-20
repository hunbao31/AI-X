import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MathText } from '../ui/MathText';

interface FeedbackCardProps {
  correct: boolean;
  correctAnswer: string;
  understandingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  suggestion: string;
  mastery: { score: number; attempts: number };
  gamification: { xp: number; level: number; streak: number };
  recommendation: { message: string; nextAction: string };
}

const LEVEL_TONE = { LOW: 'red', MEDIUM: 'yellow', HIGH: 'green' } as const;

export function FeedbackCard({
  correct,
  correctAnswer,
  understandingLevel,
  explanation,
  suggestion,
  mastery,
  gamification,
  recommendation,
}: FeedbackCardProps) {
  return (
    <Card
      className={`animate-fade-in space-y-4 border-2 ${
        correct ? 'border-green-400/40 bg-green-500/10' : 'border-red-400/40 bg-red-500/10'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${correct ? 'text-green-300' : 'text-red-300'}`}>
          {correct ? 'Correct!' : 'Incorrect'}
        </h3>
        <Badge tone={LEVEL_TONE[understandingLevel]}>
          {understandingLevel} understanding
        </Badge>
      </div>

      {!correct && (
        <p className="text-sm text-slate-300">
          Correct answer:{' '}
          <MathText text={correctAnswer} className="font-semibold text-white" />
        </p>
      )}

      <p className="text-sm text-slate-200">
        <MathText text={explanation} />
      </p>
      <p className="text-sm italic text-slate-400">
        Suggestion: <MathText text={suggestion} />
      </p>

      <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Mastery</p>
          <p className="text-lg font-bold text-white">{mastery.score}/100</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all"
              style={{ width: `${mastery.score}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Level</p>
          <p className="text-lg font-bold text-white">
            {gamification.level}{' '}
            <span className="text-sm font-normal text-slate-400">
              · {gamification.xp} XP
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Streak</p>
          <p className="text-lg font-bold text-white">🔥 {gamification.streak}d</p>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-200">
        <span className="font-semibold text-indigo-100">{recommendation.message}:</span>{' '}
        {recommendation.nextAction}
      </div>
    </Card>
  );
}
