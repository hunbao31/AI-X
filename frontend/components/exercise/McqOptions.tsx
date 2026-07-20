'use client';

import { motion, TargetAndTransition } from 'framer-motion';
import { useClickSound } from '@/lib/useClickSound';
import { springSmooth, shakeAnimation, correctPop } from '@/lib/animations';
import { MathText } from '@/components/ui/MathText';

// Set after an answer has been checked. correctAnswer is null in exam mode —
// the wrong pick still shakes red, but the right one is never revealed.
export interface AnswerFeedback {
  selected: string;
  correct: boolean;
  correctAnswer: string | null;
}

interface McqOptionsProps {
  options: string[];
  selected: string | null;
  onSelect: (option: string) => void;
  disabled?: boolean;
  feedback?: AnswerFeedback | null;
}

export function McqOptions({
  options,
  selected,
  onSelect,
  disabled,
  feedback = null,
}: McqOptionsProps) {
  const playClick = useClickSound();
  const locked = disabled || feedback !== null;

  function handleSelect(option: string) {
    if (locked) return;
    playClick();
    onSelect(option);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected === option;
        const isRevealedCorrect = feedback !== null && option === feedback.correctAnswer;
        const isWrongPick =
          feedback !== null && option === feedback.selected && !feedback.correct;

        // Feedback animations: correct pops with a bouncy single-target
        // spring; wrong shakes with tween keyframes. Never both at once.
        let animate: TargetAndTransition = { scale: isSelected ? 1.03 : 1 };
        if (isRevealedCorrect) animate = correctPop;
        else if (isWrongPick) animate = shakeAnimation;
        else if (feedback !== null) animate = { scale: 1, opacity: 0.5 };

        let tone: string;
        if (isRevealedCorrect) {
          tone =
            'border-green-400/70 bg-green-500/20 text-white shadow-lg shadow-green-500/30 ring-2 ring-green-400/50';
        } else if (isWrongPick) {
          tone =
            'border-red-400/70 bg-red-500/20 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-400/50';
        } else if (isSelected) {
          tone =
            'border-indigo-400/60 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/40';
        } else {
          tone =
            'border-white/15 bg-white/5 text-slate-200 hover:border-indigo-400/40 hover:bg-white/10';
        }

        return (
          <motion.button
            key={option}
            type="button"
            disabled={locked}
            onClick={() => handleSelect(option)}
            whileHover={locked ? undefined : { scale: 1.03 }}
            whileTap={locked ? undefined : { scale: 0.97 }}
            animate={animate}
            transition={springSmooth}
            className={`rounded-xl border p-4 text-left text-sm font-medium backdrop-blur-xl transition-colors duration-200 disabled:cursor-not-allowed ${tone}`}
          >
            <MathText text={option} />
          </motion.button>
        );
      })}
    </div>
  );
}
