import { HttpStatus, Injectable } from '@nestjs/common';
import { PriorityTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';
import { ClassesService } from '../classes/classes.service';
import { PhobertSimilarityService } from './phobert-similarity.service';
import {
  KnowledgeTracingService,
} from '../knowledge-tracing/knowledge-tracing.service';
import {
  ClassTopicReport,
  InteractionTuple,
  StudentStepResult,
} from '../knowledge-tracing/knowledge-tracing.types';
import {
  CreateDiagnosticExerciseDto,
  DiagnosticDifficulty,
  ImportDiagnosticExercisesDto,
} from './dto/create-diagnostic-exercise.dto';
import { SubmitDiagnosticAnswerDto } from './dto/submit-diagnostic-answer.dto';
import { parseDiagnosticQuestionRows } from './diagnostic-csv-import';
import { getBaiTitle } from './bai-titles.data';

const VALID_DIFFICULTIES: DiagnosticDifficulty[] = ['de', 'trung_binh', 'kho'];
const MAX_IMPORT_ROWS = 500;
const DIFFICULTY_ORDER: Record<DiagnosticDifficulty, number> = {
  de: 0,
  trung_binh: 1,
  kho: 2,
};

export interface SkillCatalogSkill {
  skillCode: string;
  vnName: string;
  priorityTier: PriorityTier;
  needsVnName: boolean;
  daCoCauHoi: boolean;
  // Lap lai gia tri cua bais.baiSgk va chuong cha -- chap nhan trung lap de
  // moi skill tu du thong tin (frontend dung truc tiep khong can tra cuu
  // nguoc len group cha).
  chuongSgk: string;
  baiSgk: number;
}

export interface SkillCatalogBai {
  baiSgk: number;
  // Ten bai chinh thuc theo PPCT (xem bai-titles.data.ts) -- null neu baiSgk
  // ngoai pham vi 1-27 hien co (khong nen xay ra voi du lieu hien tai).
  tenBai: string | null;
  skills: SkillCatalogSkill[];
}

export interface SkillCatalogChuong {
  chuongSgk: string;
  bais: SkillCatalogBai[];
}

export interface StudentCatalogBai {
  baiSgk: number;
  questionCount: number;
}

export interface StudentCatalogChuong {
  chuongSgk: string;
  bai: StudentCatalogBai[];
}

export interface PendingReviewItem {
  attemptId: string;
  status: 'PENDING' | 'REVIEWED';
  studentUsername: string;
  question: string;
  dapAnMau: string;
  cauTraLoi: string;
  // similarityScore CHI de xem "chi tiet ky thuat" (thu gon mac dinh) --
  // KHONG dung de sap xep hay goi y dung/sai, xem PhobertSimilarityService.
  similarityScore: number | null;
  createdAt: Date;
}

@Injectable()
export class DiagnosticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
    private readonly knowledgeTracingService: KnowledgeTracingService,
    private readonly phobertSimilarityService: PhobertSimilarityService,
  ) {}

  // Nhom bang SkillCatalog (DB) theo chuongSgk -> baiSgk -> skillCode, kem co
  // (daCoCauHoi) da co it nhat 1 DiagnosticExercise hay chua -- de UI danh
  // dau "Da co cau hoi" ma khong can goi rieng endpoint nao khac. Dung cho
  // trang soan cau hoi (giao vien) -- hien thi ca ky nang chua co cau hoi nao.
  async getSkillCatalog(): Promise<SkillCatalogChuong[]> {
    const [skills, exerciseRows] = await Promise.all([
      this.prisma.skillCatalog.findMany(),
      this.prisma.diagnosticExercise.findMany({
        select: { skillCode: true },
        distinct: ['skillCode'],
      }),
    ]);
    const skillCodesWithExercises = new Set(exerciseRows.map((r) => r.skillCode));

    const chuongMap = new Map<string, Map<number, SkillCatalogSkill[]>>();
    for (const skill of skills) {
      if (!chuongMap.has(skill.chuongSgk)) {
        chuongMap.set(skill.chuongSgk, new Map());
      }
      const baiMap = chuongMap.get(skill.chuongSgk)!;
      if (!baiMap.has(skill.baiSgk)) {
        baiMap.set(skill.baiSgk, []);
      }
      baiMap.get(skill.baiSgk)!.push({
        skillCode: skill.skillCode,
        vnName: skill.vnName,
        priorityTier: skill.priorityTier,
        needsVnName: skill.needsVnName,
        daCoCauHoi: skillCodesWithExercises.has(skill.skillCode),
        chuongSgk: skill.chuongSgk,
        baiSgk: skill.baiSgk,
      });
    }

    // chuongSgk luon co dang "<so>. Ten chuong" (vd "10. ..."); sap theo SO
    // do, KHONG theo alphabet -- so sanh chuoi se dat "10." truoc "2.". Neu
    // khong parse duoc so (khong nen xay ra voi du lieu hien tai), giu
    // nguyen thu tu xuat hien (Array.sort on dinh trong V8/spec ES2019+).
    const chuongOrder = (chuongSgk: string): number => {
      const m = chuongSgk.match(/^(\d+)\./);
      return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
    };

    return [...chuongMap.entries()]
      .sort((a, b) => chuongOrder(a[0]) - chuongOrder(b[0]))
      .map(([chuongSgk, baiMap]) => ({
        chuongSgk,
        bais: [...baiMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([baiSgk, skillsInBai]) => ({
            baiSgk,
            tenBai: getBaiTitle(baiSgk),
            skills: skillsInBai
              .slice()
              .sort((a, b) => a.skillCode.localeCompare(b.skillCode)),
          })),
      }));
  }

  // Danh muc chuong/bai cho hoc sinh -- chi tra ve bai da co it nhat 1 cau
  // hoi (khong co gi de luyen thi khong hien), kem tong so cau hoi trong bai.
  async getStudentCatalog(): Promise<StudentCatalogChuong[]> {
    const [skills, counts] = await Promise.all([
      this.prisma.skillCatalog.findMany({
        select: { skillCode: true, chuongSgk: true, baiSgk: true },
      }),
      this.prisma.diagnosticExercise.groupBy({
        by: ['skillCode'],
        _count: { _all: true },
      }),
    ]);
    const countBySkill = new Map(counts.map((c) => [c.skillCode, c._count._all]));

    const chuongMap = new Map<string, Map<number, number>>();
    for (const entry of skills) {
      const count = countBySkill.get(entry.skillCode) ?? 0;
      if (count === 0) continue;
      if (!chuongMap.has(entry.chuongSgk)) {
        chuongMap.set(entry.chuongSgk, new Map());
      }
      const baiMap = chuongMap.get(entry.chuongSgk)!;
      baiMap.set(entry.baiSgk, (baiMap.get(entry.baiSgk) ?? 0) + count);
    }

    // Cung cach sap xep theo SO chuong nhu getSkillCatalog() -- KHONG theo
    // alphabet (se dat "10." truoc "2.").
    const chuongOrder = (chuongSgk: string): number => {
      const m = chuongSgk.match(/^(\d+)\./);
      return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
    };

    return [...chuongMap.entries()]
      .sort((a, b) => chuongOrder(a[0]) - chuongOrder(b[0]))
      .map(([chuongSgk, baiMap]) => ({
        chuongSgk,
        bai: [...baiMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([baiSgk, questionCount]) => ({ baiSgk, questionCount })),
      }));
  }

  // Tra ve tat ca cau hoi cua 1 bai SGK (gop tu moi skillCode thuoc bai do),
  // sap xep de -> trung_binh -> kho, on dinh theo thu tu tao trong tung muc.
  async getBaiQuestions(baiSgk: number, classId: string | undefined, user: AuthenticatedUser) {
    if (!classId?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'classId là bắt buộc để làm bài theo SGK.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.classesService.assertMember(classId, user);
    const skillRows = await this.prisma.skillCatalog.findMany({
      where: { baiSgk },
      select: { skillCode: true },
    });
    const skillCodes = skillRows.map((s) => s.skillCode);
    if (skillCodes.length === 0) {
      throw apiError(
        'BAI_NOT_FOUND',
        `Không có bài SGK số ${baiSgk} trong danh mục.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const exercises = await this.prisma.diagnosticExercise.findMany({
      where: { skillCode: { in: skillCodes }, classId },
      orderBy: { createdAt: 'asc' },
    });

    return exercises
      .slice()
      .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
  }

  getSkillExercises(skillCode: string) {
    return this.prisma.diagnosticExercise
      .findMany({ where: { skillCode }, orderBy: { createdAt: 'asc' } })
      .then((rows) =>
        rows
          .slice()
          .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]),
      );
  }

  // Hoc sinh nop 1 cau tra loi -- cham bang AiService (giong /attempts cho
  // Exercise tu do), ghi lai DiagnosticAttempt de tich luy vao lich su goi
  // model KT sau nay. Khong dung chung MasteryStore/GamificationService vi
  // day la he chan doan rieng, khong phai luyen tap tu do.
  async submitAnswer(dto: SubmitDiagnosticAnswerDto, user: AuthenticatedUser) {
    const exerciseId = dto?.exerciseId?.trim();
    const answer = dto?.answer?.trim();
    const classId = dto?.classId?.trim();
    if (!exerciseId || !answer || !classId) {
      throw apiError(
        'VALIDATION_ERROR',
        'classId, exerciseId và answer là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.classesService.assertMember(classId, user);
    const exercise = await this.prisma.diagnosticExercise.findUnique({
      where: { id: exerciseId },
    });
    if (!exercise) {
      throw apiError(
        'EXERCISE_NOT_FOUND',
        'Câu hỏi chẩn đoán không tồn tại.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (exercise.classId !== classId) {
      throw apiError(
        'CLASS_EXERCISE_MISMATCH',
        'Câu hỏi chẩn đoán không thuộc lớp học đã chọn.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (exercise.answerType === 'tu_luan') {
      return this.submitTuLuanAnswer(exercise, answer, classId, user);
    }

    if (exercise.answer == null) {
      throw apiError(
        'VALIDATION_ERROR',
        'Câu hỏi trắc nghiệm bị thiếu đáp án.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Trac nghiem A/B/C/D -- dung, khac chu hoa/thuong va khoang trang thua
    // deu tinh la dung (khop quy uoc answersMatch cua sets.service.ts).
    const correct = answer.toLowerCase() === exercise.answer.trim().toLowerCase();

    await this.prisma.diagnosticAttempt.create({
      data: {
        userId: user.sub,
        diagnosticExerciseId: exercise.id,
        classId,
        skillCode: exercise.skillCode,
        answer,
        correct,
      },
    });

    return { correct, correctAnswer: exercise.answer };
  }

  // Cham tu_luan bang PhoBERT similarity -- CHI luu similarityScore de phan
  // tich/nghien cuu sau nay, KHONG bao gio dung diem nay de suy ra correct
  // hay hien bat ky "goi y dung/sai" nao. Thuc nghiem (Buoc 2) cho thay 1 cau
  // SAI ban chat, dao nguoc ket luan nhung dung tu vung gan giong dap an mau,
  // van cho similarity CAO HON ca cau dung that -- similarity thuan tuy
  // KHONG dang tin lam tin hieu quyet dinh. Vi vay MOI cau tu_luan deu
  // needsTeacherReview=true, correct=null, khong co ngoai le "diem cao thi
  // bo qua duyet".
  private async submitTuLuanAnswer(
    exercise: { id: string; skillCode: string; dapAnMau: string | null },
    answer: string,
    classId: string,
    user: AuthenticatedUser,
  ) {
    if (!exercise.dapAnMau) {
      throw apiError(
        'VALIDATION_ERROR',
        'Câu hỏi tự luận bị thiếu đáp án mẫu.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const { similarity_score: similarityScore } =
      await this.phobertSimilarityService.computeSimilarity(answer, exercise.dapAnMau);

    await this.prisma.diagnosticAttempt.create({
      data: {
        userId: user.sub,
        diagnosticExerciseId: exercise.id,
        classId,
        skillCode: exercise.skillCode,
        answer,
        correct: null,
        similarityScore,
        needsTeacherReview: true,
      },
    });

    return { correct: null, needsTeacherReview: true };
  }

  // Bao cao AI cho ca lop (giao vien) -- gop lich su DiagnosticAttempt cua
  // tung hoc sinh thanh interactions [skillCode, 0|1] theo dung thu tu thoi
  // gian, goi predict_class 1 lan duy nhat. skillCode chinh la "ten_bai_tap"
  // ma model da duoc train (khop truc tiep voi exercise_to_id trong
  // exercise_map.json cua kt_model_service) nen khong can lop dich nao.
  async getClassReport(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<ClassTopicReport[]> {
    await this.classesService.assertTeacherOf(classId, user);

    const members = await this.prisma.classMember.findMany({
      where: { classId, role: 'student' },
      select: { userId: true },
    });
    if (members.length === 0) return [];

    const students = await Promise.all(
      members.map(async (m) => {
        // correct: { not: null } -- loai bo cau tu_luan dang cho giao vien
        // duyet khoi lich su gui cho model KT, tranh tinh nham thanh "sai".
        const attempts = await this.prisma.diagnosticAttempt.findMany({
          where: { userId: m.userId, correct: { not: null } },
          orderBy: { createdAt: 'asc' },
          select: { skillCode: true, correct: true },
        });
        const interactions: InteractionTuple[] = attempts.map((a) => [
          a.skillCode,
          a.correct === true ? 1 : 0,
        ]);
        return { id: m.userId, interactions };
      }),
    );

    const withHistory = students.filter((s) => s.interactions.length > 0);
    if (withHistory.length === 0) return [];

    return this.knowledgeTracingService.predictClass(withHistory);
  }

  // Bao cao AI theo TUNG hoc sinh trong lop (khac getClassReport o tren, chi
  // tra trung binh theo chu de chung ca lop, khong tach tung nguoi) -- goi
  // predictStudent rieng cho moi thanh vien, gop ket qua cac chu de cua rieng
  // ho thanh 1 con so % duy nhat (trung binh don gian, khong gia quyen vi day
  // la du lieu cua 1 nguoi, khong phai gop nhieu nguoi nhu getClassReport).
  async getClassStudentReports(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<{ userId: string; username: string; percent: number | null }[]> {
    await this.classesService.assertTeacherOf(classId, user);

    const members = await this.prisma.classMember.findMany({
      where: { classId, role: 'student' },
      select: { userId: true, user: { select: { username: true } } },
    });
    if (members.length === 0) return [];

    const results = await Promise.all(
      members.map(async (m) => {
        // correct: { not: null } -- loai bo cau tu_luan dang cho giao vien
        // duyet khoi lich su gui cho model KT, tranh tinh nham thanh "sai".
        const attempts = await this.prisma.diagnosticAttempt.findMany({
          where: { userId: m.userId, correct: { not: null } },
          orderBy: { createdAt: 'asc' },
          select: { skillCode: true, correct: true },
        });
        if (attempts.length === 0) {
          return { userId: m.userId, username: m.user.username, percent: null };
        }
        const interactions: InteractionTuple[] = attempts.map((a) => [
          a.skillCode,
          a.correct === true ? 1 : 0,
        ]);
        const steps = await this.knowledgeTracingService.predictStudent(interactions);
        const percent =
          steps.length === 0
            ? null
            : Math.round(
                (steps.reduce((sum, s) => sum + s.phan_tram_hieu, 0) / steps.length) * 100,
              );
        return { userId: m.userId, username: m.user.username, percent };
      }),
    );

    return results.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
  }

  // Bao cao AI cho chinh hoc sinh dang dang nhap.
  async getMyReport(user: AuthenticatedUser): Promise<StudentStepResult[]> {
    // correct: { not: null } -- loai bo cau tu_luan dang cho giao vien duyet
    // khoi lich su gui cho model KT, tranh tinh nham thanh "sai".
    const attempts = await this.prisma.diagnosticAttempt.findMany({
      where: { userId: user.sub, correct: { not: null } },
      orderBy: { createdAt: 'asc' },
      select: { skillCode: true, correct: true },
    });
    if (attempts.length === 0) return [];

    const interactions: InteractionTuple[] = attempts.map((a) => [
      a.skillCode,
      a.correct === true ? 1 : 0,
    ]);
    return this.knowledgeTracingService.predictStudent(interactions);
  }

  async createExercise(dto: CreateDiagnosticExerciseDto, user: AuthenticatedUser) {
    const classId = dto?.classId?.trim();
    const skillCode = dto?.skillCode?.trim();
    const question = dto?.question?.trim();
    const answer = dto?.answer?.trim();
    const options = (dto?.options ?? [])
      .map((o) => o?.trim())
      .filter((o): o is string => !!o);

    if (!classId || !skillCode || !question || !answer) {
      throw apiError(
        'VALIDATION_ERROR',
        'Lớp, kỹ năng, câu hỏi và đáp án là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.classesService.assertTeacherOf(classId, user);
    if (!VALID_DIFFICULTIES.includes(dto?.difficulty)) {
      throw apiError(
        'VALIDATION_ERROR',
        'Độ khó phải là "de", "trung_binh" hoặc "kho".',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (options.length < 2) {
      throw apiError(
        'VALIDATION_ERROR',
        'Cần ít nhất hai lựa chọn.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      throw apiError(
        'VALIDATION_ERROR',
        'Các lựa chọn phải khác nhau.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (!options.some((o) => o.toLowerCase() === answer.toLowerCase())) {
      throw apiError(
        'VALIDATION_ERROR',
        'Đáp án đúng phải khớp với một trong các lựa chọn.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const skillExists = await this.prisma.skillCatalog.findUnique({
      where: { skillCode },
      select: { skillCode: true },
    });
    if (!skillExists) {
      throw apiError(
        'VALIDATION_ERROR',
        `Kỹ năng "${skillCode}" không nằm trong danh mục 144 bài hiện tại.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.prisma.diagnosticExercise.create({
      data: {
        skillCode,
        classId,
        difficulty: dto.difficulty,
        question,
        options,
        answer,
        createdBy: user.sub,
      },
    });
  }

  // Nhap hang loat cau hoi trac nghiem cho 1 skillCode co dinh (chon boi
  // giao vien luc keo ky nang vao UI truoc, khong doc tu CSV). Moi dong CSV
  // la 1 cau, dung parseDiagnosticQuestionRows (mirror exercises/csv-import.ts).
  async importExercises(dto: ImportDiagnosticExercisesDto, user: AuthenticatedUser) {
    const classId = dto?.classId?.trim();
    const skillCode = dto?.skillCode?.trim();
    if (!classId || !skillCode) {
      throw apiError(
        'VALIDATION_ERROR',
        'classId và skillCode là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    await this.classesService.assertTeacherOf(classId, user);
    const skillExists = await this.prisma.skillCatalog.findUnique({
      where: { skillCode },
      select: { skillCode: true },
    });
    if (!skillExists) {
      throw apiError(
        'VALIDATION_ERROR',
        `Kỹ năng "${skillCode}" không nằm trong danh mục 144 bài hiện tại.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (typeof dto?.csv !== 'string' || dto.csv.trim() === '') {
      throw apiError(
        'VALIDATION_ERROR',
        'Nội dung CSV là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const defaultDifficulty: DiagnosticDifficulty = VALID_DIFFICULTIES.includes(
      dto.difficulty as DiagnosticDifficulty,
    )
      ? (dto.difficulty as DiagnosticDifficulty)
      : 'de';

    const { questions, errors } = parseDiagnosticQuestionRows(dto.csv, defaultDifficulty);

    if (questions.length > MAX_IMPORT_ROWS) {
      throw apiError(
        'IMPORT_TOO_LARGE',
        `Chỉ được nhập tối đa ${MAX_IMPORT_ROWS} câu hỏi mỗi tệp.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (questions.length > 0) {
      await this.prisma.diagnosticExercise.createMany({
        data: questions.map((q) => ({
          skillCode,
          classId,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options,
          answer: q.answer,
          createdBy: user.sub,
        })),
      });
    }

    return {
      created: questions.length,
      failed: errors.length,
      errors: errors.map((e) => `Dòng ${e.row}: ${e.reason}`),
    };
  }

  // Danh sach cau tu_luan CHUA duyet cua hoc sinh trong 1 lop -- chi giao
  // vien cua lop do. Sap xep theo THOI GIAN NOP BAI (cu nhat truoc), KHONG
  // theo similarityScore -- tranh tao an tuong ngam rang thu tu co y nghia
  // uu tien nao (xem PhobertSimilarityService).
  async getPendingReview(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<PendingReviewItem[]> {
    await this.classesService.assertTeacherOf(classId, user);

    const members = await this.prisma.classMember.findMany({
      where: { classId, role: 'student' },
      select: { userId: true },
    });
    if (members.length === 0) return [];

    const attempts = await this.prisma.diagnosticAttempt.findMany({
      where: {
        userId: { in: members.map((m) => m.userId) },
        needsTeacherReview: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        needsTeacherReview: true,
        answer: true,
        similarityScore: true,
        createdAt: true,
        user: { select: { username: true } },
        exercise: { select: { question: true, dapAnMau: true } },
      },
    });

    return attempts.map((a) => ({
      attemptId: a.id,
      // Chi la field response; khong luu DB va khong anh huong luong AI.
      status: a.needsTeacherReview ? 'PENDING' : 'REVIEWED',
      studentUsername: a.user.username,
      question: a.exercise.question,
      dapAnMau: a.exercise.dapAnMau ?? '',
      cauTraLoi: a.answer,
      similarityScore: a.similarityScore,
      createdAt: a.createdAt,
    }));
  }

  // Giao vien duyet 1 cau tu_luan -- dong bo correct theo dung ket luan cua
  // giao vien (KHONG lien quan similarityScore), tat needsTeacherReview.
  async reviewAttempt(
    attemptId: string,
    correct: boolean,
    user: AuthenticatedUser,
  ): Promise<void> {
    const attempt = await this.prisma.diagnosticAttempt.findUnique({
      where: { id: attemptId },
      select: { id: true, userId: true },
    });
    if (!attempt) {
      throw apiError(
        'ATTEMPT_NOT_FOUND',
        'Lượt làm bài không tồn tại.',
        HttpStatus.NOT_FOUND,
      );
    }

    const membership = await this.prisma.classMember.findFirst({
      where: { userId: attempt.userId, role: 'student', class: { teacherId: user.sub } },
      select: { classId: true },
    });
    if (user.role !== 'admin' && !membership) {
      throw apiError(
        'FORBIDDEN',
        'Chỉ giáo viên của lớp học sinh này mới có thể duyệt.',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.diagnosticAttempt.update({
      where: { id: attemptId },
      data: {
        teacherReviewedCorrect: correct,
        correct,
        needsTeacherReview: false,
        reviewedAt: new Date(),
        reviewedBy: user.sub,
      },
    });
  }
}
