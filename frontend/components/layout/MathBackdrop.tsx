export function MathBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* faint graph-paper grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* faint geometric shapes */}
      <svg
        className="absolute -left-16 -top-16 h-72 w-72 text-indigo-400/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg
        className="absolute -bottom-20 -right-10 h-80 w-80 text-purple-400/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <polygon points="50,5 95,95 5,95" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg
        className="absolute right-[6%] top-[55%] h-40 w-40 text-amber-300/10"
        viewBox="0 0 100 100"
        fill="none"
      >
        <rect x="10" y="10" width="80" height="80" rx="8" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* faint formula glyphs */}
      <span className="absolute right-[12%] top-[18%] select-none font-serif text-7xl text-indigo-300/[0.06]">
        π
      </span>
      <span className="absolute left-[8%] bottom-[15%] select-none font-serif text-6xl text-purple-300/[0.06]">
        ∑
      </span>
      <span className="absolute left-[42%] top-[10%] select-none font-serif text-5xl text-amber-200/[0.05]">
        √
      </span>
      <span className="absolute left-[20%] top-[45%] select-none font-serif text-4xl text-indigo-200/[0.05]">
        ∞
      </span>
    </div>
  );
}
