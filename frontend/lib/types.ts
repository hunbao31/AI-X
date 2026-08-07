// Shared API types — mirror the backend response shapes.

export type Role = 'student' | 'teacher' | 'admin';
export type Theme = 'light' | 'dark';
export type ExerciseType = 'mcq' | 'text';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type UnderstandingLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  theme: Theme;
  avatar: string;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

export interface Exercise {
  id: string;
  question: string;
  type: ExerciseType;
  options: string[] | null;
  answer: string;
  difficulty: Difficulty;
  topic: string;
  topicId: string | null;
  // Only meaningful when topicId is null — a topic-linked question is
  // already private to that class regardless of this flag.
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ClassSummary {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  createdAt: string;
  teacher: { id: string; username: string };
  _count: { members: number; topics: number; sets: number };
}

export interface ClassMemberInfo {
  id: string;
  role: Role;
  joinedAt: string;
  user: { id: string; username: string; avatar: string };
}

export interface TopicInfo {
  id: string;
  name: string;
  classId: string;
  createdAt: string;
  _count: { exercises: number };
}

export interface SetInClass {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  timeLimitPerQuestion: number | null;
  createdAt: string;
  _count: { items: number };
}

export interface ClassDetail {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  createdAt: string;
  teacher: { id: string; username: string };
  members: ClassMemberInfo[];
  topics: TopicInfo[];
  sets: SetInClass[];
}

export type QuizMode = 'practice' | 'exam';

export interface SetSummary {
  id: string;
  title: string;
  description: string | null;
  classId: string | null;
  isPublic: boolean;
  isPublished: boolean;
  mode: QuizMode;
  timeLimitPerQuestion: number | null;
  createdBy: string;
  createdAt: string;
  creator: { id: string; username: string };
  class: { id: string; name: string } | null;
  _count: { items: number; attempts: number };
}

export interface PlayableQuestion {
  exerciseId: string;
  order: number;
  question: string;
  type: ExerciseType;
  options: string[] | null;
  difficulty: Difficulty;
  topic: string;
}

export interface SetItem {
  id: string;
  setId: string;
  exerciseId: string;
  order: number;
  exercise: Exercise;
}

export interface SetDetail {
  id: string;
  title: string;
  description: string | null;
  classId: string | null;
  class: { id: string; name: string } | null;
  isPublic: boolean;
  isPublished: boolean;
  mode: QuizMode;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  totalTimeLimit: number | null;
  // Owner only; others see hasAccessCode.
  accessCode?: string | null;
  hasAccessCode: boolean;
  timeLimitPerQuestion: number | null;
  roomCode: string | null;
  createdBy: string;
  creator: { id: string; username: string };
  createdAt: string;
  questionCount: number;
  questions: PlayableQuestion[];
  // Present only when the requester owns the set.
  items?: SetItem[];
}

export interface QuestionResult {
  exerciseId: string;
  correct: boolean;
  yourAnswer: string;
  // null in exam mode — the server never reveals the answer.
  correctAnswer: string | null;
  xpEarned: number;
}

export interface CheckResult {
  correct: boolean;
  correctAnswer: string;
}

export interface XpLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
}

export interface GamificationSummary {
  xp: number;
  level: number;
  streak: number;
  // Present on GET /gamification (computed server-side).
  badges?: Badge[];
}

export interface QuizResult {
  attemptId: string | null;
  score: number;
  correctCount: number;
  totalCount: number;
  xpGained: number;
  results: QuestionResult[];
  gamification: GamificationSummary;
}

export interface StoredAnswer {
  exerciseId: string;
  answer: string;
  timeMs?: number;
}

export interface StartAttemptResult {
  attemptId: string;
  lastQuestionIndex: number;
  answers: StoredAnswer[];
}

export interface ContinueInfo {
  attemptId: string;
  setId: string;
  title: string;
  mode: QuizMode;
  lastQuestionIndex: number;
  totalCount: number;
  startedAt: string;
}

export interface QuizHistoryEntry {
  attemptId: string;
  setId: string;
  title: string;
  mode: QuizMode;
  score: number;
  correctCount: number;
  totalCount: number;
  durationSeconds: number | null;
  completedAt: string;
}

export interface RecentActivity {
  lastQuiz: {
    setId: string;
    title: string;
    correctCount: number;
    totalCount: number;
    score: number;
    completedAt: string;
  } | null;
  lastTopic: { topic: string; at: string } | null;
}

export interface FavoriteEntry {
  id: string;
  createdAt: string;
  exercise: Exercise;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface QuickQuiz {
  topic: string;
  questionCount: number;
  questions: PlayableQuestion[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  correctCount: number;
  totalCount: number;
  completedAt: string | null;
}

export interface AnalyticsSummary {
  totalAttempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageMastery: number;
}

export interface TopicAnalytics {
  topic: string;
  attempts: number;
  correct: number;
  correctRate: number;
  masteryScore: number;
}

export interface TopicRecommendation {
  topic: string;
  masteryScore: number;
  correctRate: number;
  attempts: number;
  action: 'repeat' | 'practice' | 'advance';
  message: string;
}

export interface AttemptResult {
  correct: boolean;
  understandingLevel: UnderstandingLevel;
  explanation: string;
  suggestion: string;
  mastery: { score: number; attempts: number };
  recommendation: { message: string; nextAction: string };
  gamification: GamificationSummary;
}

export interface UserProfile extends PublicUser {
  createdAt: string;
}

// --- Community forum ---

export interface ForumAuthor {
  id: string;
  username: string;
  avatar: string;
}

export interface ForumPostSummary {
  id: string;
  imageUrl: string | null;
  description: string | null;
  answerCount: number;
  rewardScore: number;
  hasAcceptedAnswer: boolean;
  createdAt: string;
  author: ForumAuthor;
  topic: { id: string; name: string } | null;
  class: { id: string; name: string } | null;
}

export interface ForumAnswer {
  id: string;
  content: string;
  imageUrl: string | null;
  isAccepted: boolean;
  upvoteCount: number;
  createdAt: string;
  author: ForumAuthor;
  upvotedByMe: boolean;
}

export interface ForumPostDetail extends ForumPostSummary {
  answers: ForumAnswer[];
}

export type ForumSort = 'newest' | 'most_answered' | 'most_rewarded';

export interface UpvoteResult {
  upvoted: boolean;
  upvoteCount: number;
}

export interface AcceptResult {
  id: string;
  isAccepted: boolean;
}

// --- Quiz builder / personal bank / marketplace ---

// Mirrors backend CreateInlineQuestionDto — fast-path authoring, no
// separate "create in the bank" step.
export interface InlineQuestionPayload {
  question: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: string;
  difficulty?: Difficulty;
}

export interface MarketplaceSet {
  id: string;
  title: string;
  description: string | null;
  mode: QuizMode;
  createdAt: string;
  creator: ForumAuthor;
  _count: { items: number; attempts: number };
}

// --- Diagnostic skill catalog (drag-and-drop authoring) ---

export type PriorityTier = 'cao' | 'trung_binh' | 'thap';
export type DiagnosticDifficulty = 'de' | 'trung_binh' | 'kho';

export interface SkillCatalogSkill {
  skillCode: string;
  vnName: string;
  priorityTier: PriorityTier;
  needsVnName: boolean;
  daCoCauHoi: boolean;
  chuongSgk: string;
  baiSgk: number;
}

export interface SkillCatalogBai {
  baiSgk: number;
  tenBai: string | null;
  skills: SkillCatalogSkill[];
}

export interface SkillCatalogChuong {
  chuongSgk: string;
  bais: SkillCatalogBai[];
}

export interface DiagnosticExercise {
  id: string;
  skillCode: string;
  difficulty: DiagnosticDifficulty;
  question: string;
  options: string[];
  answer: string;
  createdBy: string;
  createdAt: string;
}

export interface PendingReviewItem {
  attemptId: string;
  studentUsername: string;
  question: string;
  dapAnMau: string;
  cauTraLoi: string;
  // Chi de xem trong "Chi tiet ky thuat" (thu gon mac dinh) -- KHONG dung de
  // sap xep hay goi y dung/sai, xem backend/src/diagnostic/phobert-similarity.service.ts.
  similarityScore: number | null;
  createdAt: string;
}

// --- Student-facing chuong/bai catalog + practice + AI report ---
// Field names in StudentStepResult/ClassTopicReport mirror the external KT
// model API's own Vietnamese-no-diacritics JSON keys verbatim — see
// backend/src/knowledge-tracing/knowledge-tracing.types.ts.

export interface StudentCatalogBai {
  baiSgk: number;
  questionCount: number;
}

export interface StudentCatalogChuong {
  chuongSgk: string;
  bai: StudentCatalogBai[];
}

export interface DiagnosticAttemptResult {
  correct: boolean;
  correctAnswer: string;
}

export interface StudentStepResult {
  bai_tap: string;
  phan_tram_hieu: number;
  muc_do: 'Can chu y' | 'Chua chac chan' | 'Co ve vung';
  canh_bao: boolean;
  tien_de_thieu: string[];
}

export interface ClassStudentReport {
  userId: string;
  username: string;
  percent: number | null;
}

export interface ClassTopicReport {
  chu_de: string;
  so_hoc_sinh: number;
  ty_le_do: number;
  ty_le_vang: number;
  ty_le_xanh: number;
  muc_do_hieu_trung_binh: number | null;
}
