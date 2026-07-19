interface MotivationalQuoteProps {
  className?: string;
}

export function MotivationalQuote({ className = '' }: MotivationalQuoteProps) {
  return (
    <p
      className={`animate-fade-in bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-center font-serif italic leading-snug text-transparent drop-shadow-[0_0_18px_rgba(168,85,247,0.35)] ${className}`}
    >
      &ldquo;The smallest difference between people is intelligence, but the
      biggest difference is perseverance.&rdquo;
    </p>
  );
}
