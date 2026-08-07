import { HttpStatus, Injectable } from '@nestjs/common';
import { PriorityTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';
import { ClassesService } from '../classes/classes.service';
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

@Injectable()
export class DiagnosticService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
    private readonly knowledgeTracingService: KnowledgeTracingService,
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
  async getBaiQuestions(baiSgk: number) {
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
      where: { skillCode: { in: skillCodes } },
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
    if (!exerciseId || !answer) {
      throw apiError(
        'VALIDATION_ERROR',
        'exerciseId và answer là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

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

    // Trac nghiem A/B/C/D -- dung, khac chu hoa/thuong va khoang trang thua
    // deu tinh la dung (khop quy uoc answersMatch cua sets.service.ts).
    const correct = answer.toLowerCase() === exercise.answer.trim().toLowerCase();

    await this.prisma.diagnosticAttempt.create({
      data: {
        userId: user.sub,
        diagnosticExerciseId: exercise.id,
        skillCode: exercise.skillCode,
        answer,
        correct,
      },
    });

    return { correct, correctAnswer: exercise.answer };
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
        const attempts = await this.prisma.diagnosticAttempt.findMany({
          where: { userId: m.userId },
          orderBy: { createdAt: 'asc' },
          select: { skillCode: true, correct: true },
        });
        const interactions: InteractionTuple[] = attempts.map((a) => [
          a.skillCode,
          a.correct ? 1 : 0,
        ]);
        return { id: m.userId, interactions };
      }),
    );

    const withHistory = students.filter((s) => s.interactions.length > 0);
    if (withHistory.length === 0) return [];

    return this.knowledgeTracingService.predictClass(withHistory);
  }

  // Bao cao AI cho chinh hoc sinh dang dang nhap.
  async getMyReport(user: AuthenticatedUser): Promise<StudentStepResult[]> {
    const attempts = await this.prisma.diagnosticAttempt.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'asc' },
      select: { skillCode: true, correct: true },
    });
    if (attempts.length === 0) return [];

    const interactions: InteractionTuple[] = attempts.map((a) => [
      a.skillCode,
      a.correct ? 1 : 0,
    ]);
    return this.knowledgeTracingService.predictStudent(interactions);
  }

  async createExercise(dto: CreateDiagnosticExerciseDto, user: AuthenticatedUser) {
    const skillCode = dto?.skillCode?.trim();
    const question = dto?.question?.trim();
    const answer = dto?.answer?.trim();
    const options = (dto?.options ?? [])
      .map((o) => o?.trim())
      .filter((o): o is string => !!o);

    if (!skillCode || !question || !answer) {
      throw apiError(
        'VALIDATION_ERROR',
        'Kỹ năng, câu hỏi và đáp án là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
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
    const skillCode = dto?.skillCode?.trim();
    if (!skillCode) {
      throw apiError(
        'VALIDATION_ERROR',
        'skillCode là bắt buộc.',
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
}
