import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_PER_SOURCE = 200;
const QUESTION_PREVIEW_LEN = 80;

export type AdminAttemptType = 'luyen_tap' | 'bo_de' | 'chan_doan';

export interface AdminAttemptRow {
  loai: AdminAttemptType;
  loaiNhan: string;
  hocSinh: string;
  tenBai: string;
  ketQua: string;
  thoiGian: string;
  // Cac cot du lieu tho theo kieu "problem log" (Junyi) -- null khi khong
  // ap dung cho loai lam bai nay (vd bo_de la 1 lot nhieu cau, khong co 1
  // dap an/do kho duy nhat).
  maKyNang: string | null;
  doKho: string | null;
  dapAnHocSinh: string | null;
  dapAnDung: string | null;
  thoiGianLamGiay: number | null;
}

const LOAI_NHAN: Record<AdminAttemptType, string> = {
  luyen_tap: 'Luyện tập',
  bo_de: 'Bộ đề',
  chan_doan: 'Chẩn đoán AI',
};

function truncate(text: string, len: number): string {
  const t = text.trim();
  return t.length > len ? `${t.slice(0, len)}…` : t;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Gop 3 nguon "luot lam" rieng biet (Attempt/QuizAttempt/DiagnosticAttempt)
  // thanh 1 danh sach duy nhat cho trang admin, moi dong co ten hoc sinh +
  // ten bai RO RANG (khong chi ma/id) + ket qua, sap theo thoi gian moi nhat.
  async getAllAttempts(): Promise<AdminAttemptRow[]> {
    const [attempts, quizAttempts, diagnosticAttempts] = await Promise.all([
      this.prisma.attempt.findMany({
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_SOURCE,
        include: { user: { select: { username: true } } },
      }),
      this.prisma.quizAttempt.findMany({
        orderBy: { startedAt: 'desc' },
        take: MAX_PER_SOURCE,
        include: {
          user: { select: { username: true } },
          set: { select: { title: true } },
        },
      }),
      this.prisma.diagnosticAttempt.findMany({
        orderBy: { createdAt: 'desc' },
        take: MAX_PER_SOURCE,
        include: {
          user: { select: { username: true } },
          exercise: { select: { answer: true, difficulty: true } },
        },
      }),
    ]);

    // Attempt.exerciseId khong phai FK Prisma that (chi la string tu do) --
    // phai tra cuu rieng, va co the tro toi 1 Exercise da bi xoa.
    const exerciseIds = [...new Set(attempts.map((a) => a.exerciseId))];
    const exercises = exerciseIds.length
      ? await this.prisma.exercise.findMany({
          where: { id: { in: exerciseIds } },
          select: { id: true, question: true, topic: true, answer: true, difficulty: true },
        })
      : [];
    const exerciseById = new Map(exercises.map((e) => [e.id, e]));

    const skillCodes = [...new Set(diagnosticAttempts.map((a) => a.skillCode))];
    const skills = skillCodes.length
      ? await this.prisma.skillCatalog.findMany({
          where: { skillCode: { in: skillCodes } },
          select: { skillCode: true, vnName: true },
        })
      : [];
    const vnNameBySkillCode = new Map(skills.map((s) => [s.skillCode, s.vnName]));

    const rows: AdminAttemptRow[] = [];

    for (const a of attempts) {
      const ex = exerciseById.get(a.exerciseId);
      rows.push({
        loai: 'luyen_tap',
        loaiNhan: LOAI_NHAN.luyen_tap,
        hocSinh: a.user.username,
        tenBai: ex ? `${truncate(ex.question, QUESTION_PREVIEW_LEN)} (${ex.topic})` : '(bài đã bị xoá)',
        ketQua: a.correct ? 'Đúng' : 'Sai',
        thoiGian: a.createdAt.toISOString(),
        maKyNang: null,
        doKho: ex?.difficulty ?? null,
        dapAnHocSinh: a.answer,
        dapAnDung: ex?.answer ?? null,
        thoiGianLamGiay: null,
      });
    }

    for (const q of quizAttempts) {
      rows.push({
        loai: 'bo_de',
        loaiNhan: LOAI_NHAN.bo_de,
        hocSinh: q.user.username,
        tenBai: q.set?.title ?? '(bộ đề đã bị xoá)',
        ketQua: q.completedAt
          ? `${q.correctCount}/${q.totalCount} câu đúng`
          : `Đang làm (${q.lastQuestionIndex}/${q.totalCount || '?'})`,
        thoiGian: q.startedAt.toISOString(),
        // 1 dong = ca 1 lot lam nhieu cau, khong co 1 dap an/do kho duy nhat.
        maKyNang: null,
        doKho: null,
        dapAnHocSinh: null,
        dapAnDung: null,
        thoiGianLamGiay: q.durationSeconds,
      });
    }

    for (const d of diagnosticAttempts) {
      rows.push({
        loai: 'chan_doan',
        loaiNhan: LOAI_NHAN.chan_doan,
        hocSinh: d.user.username,
        tenBai: vnNameBySkillCode.get(d.skillCode) ?? d.skillCode,
        ketQua: d.correct ? 'Đúng' : 'Sai',
        thoiGian: d.createdAt.toISOString(),
        maKyNang: d.skillCode,
        doKho: d.exercise.difficulty,
        dapAnHocSinh: d.answer,
        dapAnDung: d.exercise.answer,
        thoiGianLamGiay: null,
      });
    }

    return rows
      .sort((a, b) => (a.thoiGian < b.thoiGian ? 1 : -1))
      .slice(0, MAX_PER_SOURCE);
  }
}
