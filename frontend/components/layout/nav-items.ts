// Single source for role navigation — consumed by the desktop sidebars and
// the mobile horizontal nav.

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const STUDENT_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Trang tổng quan', icon: '📊' },
  { href: '/classes', label: 'Lớp học', icon: '🏫' },
  { href: '/practice', label: 'Luyện tập', icon: '✏️' },
  { href: '/quizzes', label: 'Ngân hàng câu hỏi', icon: '🗂️' },
  { href: '/forum', label: 'Diễn đàn', icon: '💬' },
  { href: '/saved', label: 'Đã lưu', icon: '⭐' },
  { href: '/history', label: 'Lịch sử', icon: '🕘' },
  { href: '/leaderboard', label: 'Bảng xếp hạng', icon: '🏆' },
  { href: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

export const TEACHER_NAV: NavItem[] = [
  { href: '/teacher/dashboard', label: 'Trang tổng quan', icon: '📈' },
  { href: '/teacher/classes', label: 'Lớp học', icon: '🏫' },
  { href: '/teacher/sets', label: 'Tạo đề', icon: '🎯' },
  { href: '/teacher/review', label: 'Duyệt tự luận', icon: '✅' },
  { href: '/teacher/manage', label: 'Ngân hàng câu hỏi', icon: '🗂️' },
  { href: '/teacher/marketplace', label: 'Kho đề', icon: '🛒' },
  { href: '/teacher/forum', label: 'Diễn đàn', icon: '💬' },
  { href: '/teacher/settings', label: 'Cài đặt', icon: '⚙️' },
];
