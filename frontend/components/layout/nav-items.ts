// Single source for role navigation — consumed by the desktop sidebars and
// the mobile horizontal nav.

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const STUDENT_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/practice', label: 'Practice', icon: '✏️' },
  { href: '/quizzes', label: 'Quizzes', icon: '🎯' },
  { href: '/quick-quiz', label: 'Quick Quiz', icon: '🎲' },
  { href: '/saved', label: 'Saved', icon: '⭐' },
  { href: '/history', label: 'History', icon: '🕘' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export const TEACHER_NAV: NavItem[] = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: '📈' },
  { href: '/teacher/classes', label: 'Classes', icon: '🏫' },
  { href: '/teacher/create', label: 'Create Exercise', icon: '➕' },
  { href: '/teacher/manage', label: 'Manage Exercises', icon: '🗂️' },
  { href: '/teacher/sets', label: 'Quiz Sets', icon: '🎯' },
  { href: '/teacher/settings', label: 'Settings', icon: '⚙️' },
];
