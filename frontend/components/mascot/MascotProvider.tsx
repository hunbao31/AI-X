'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MascotMood,
  MascotReactionType,
  MascotReactionPreset,
  REACTION_PRESETS,
} from './expressions';

// After this long without any reaction or mood change, Koaly dozes off.
const SLEEPY_AFTER_MS = 90_000;
const SLEEPY_CHECK_MS = 15_000;

export interface ActiveReaction extends MascotReactionPreset {
  type: MascotReactionType;
  // Monotonic id — remounts the reaction animation even when the same
  // reaction fires twice in a row.
  id: number;
}

interface MascotState {
  mood: MascotMood;
  reaction: ActiveReaction | null;
  visible: boolean;
}

export interface MascotApi {
  /** Fire a transient reaction (auto-reverts to the current mood). */
  react: (type: MascotReactionType, bubbleOverride?: string) => void;
  /** Set the persistent baseline mood. */
  setMood: (mood: MascotMood) => void;
  /** Hide/show the floating widget (e.g. during full-screen overlays). */
  setVisible: (visible: boolean) => void;
}

// Split contexts: pages call the API (stable identity — subscribing to it
// never re-renders them), only the floating widget subscribes to state.
const StateContext = createContext<MascotState>({
  mood: 'idle',
  reaction: null,
  visible: true,
});
const ApiContext = createContext<MascotApi>({
  react: () => undefined,
  setMood: () => undefined,
  setVisible: () => undefined,
});

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMoodState] = useState<MascotMood>('idle');
  const [reaction, setReaction] = useState<ActiveReaction | null>(null);
  const [visible, setVisible] = useState(true);

  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionSeq = useRef(0);
  const lastActivity = useRef(Date.now());

  const react = useCallback((type: MascotReactionType, bubbleOverride?: string) => {
    const preset = REACTION_PRESETS[type];
    lastActivity.current = Date.now();
    reactionSeq.current += 1;

    setReaction({
      ...preset,
      bubble: bubbleOverride !== undefined ? bubbleOverride : preset.bubble,
      type,
      id: reactionSeq.current,
    });

    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), preset.durationMs);
  }, []);

  const setMood = useCallback((next: MascotMood) => {
    lastActivity.current = Date.now();
    setMoodState((prev) => (prev === next ? prev : next));
  }, []);

  // Inactivity → sleepy. Waking happens implicitly: any react()/setMood()
  // bumps lastActivity and sets a fresh mood.
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > SLEEPY_AFTER_MS) {
        setMoodState((prev) => (prev === 'sleepy' ? prev : 'sleepy'));
      }
    }, SLEEPY_CHECK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, []);

  const api = useMemo<MascotApi>(
    () => ({ react, setMood, setVisible }),
    [react, setMood],
  );
  const state = useMemo<MascotState>(
    () => ({ mood, reaction, visible }),
    [mood, reaction, visible],
  );

  return (
    <ApiContext.Provider value={api}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ApiContext.Provider>
  );
}

/** Page-facing API: `const { react, setMood } = useMascot()`. */
export function useMascot(): MascotApi {
  return useContext(ApiContext);
}

/** Widget-facing state (re-renders on every expression change). */
export function useMascotState(): MascotState {
  return useContext(StateContext);
}
