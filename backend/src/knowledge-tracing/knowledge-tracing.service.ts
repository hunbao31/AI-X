import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { apiError } from '../common/api-envelope';
import {
  ClassStudentInput,
  ClassTopicReport,
  InteractionTuple,
  PredictClassResponse,
  PredictStudentResponse,
  StudentStepResult,
} from './knowledge-tracing.types';

// The model runs on a personal machine and is reached through an ngrok
// tunnel, so the URL rotates whenever that tunnel restarts — never hardcode
// it. See .env.example for the Railway variable note.
const MODEL_API_URL = process.env.KT_MODEL_API_URL;
const STUDENT_TIMEOUT_MS = Number(
  process.env.KT_MODEL_API_TIMEOUT_STUDENT_MS ?? 30_000,
);
const CLASS_TIMEOUT_MS = Number(
  process.env.KT_MODEL_API_TIMEOUT_CLASS_MS ?? 60_000,
);

// ngrok's free tier injects an HTML interstitial warning page in front of
// every tunneled request unless this header is present, which would
// otherwise break JSON parsing on every call.
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

const UNAVAILABLE_MESSAGE =
  'Không kết nối được với hệ thống phân tích, thử lại sau';

@Injectable()
export class KnowledgeTracingService {
  private readonly logger = new Logger(KnowledgeTracingService.name);

  private async callModel<T>(
    path: string,
    body: unknown,
    timeoutMs: number,
  ): Promise<T> {
    if (!MODEL_API_URL) {
      this.logger.error('KT_MODEL_API_URL is not set.');
      throw apiError(
        'MODEL_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${MODEL_API_URL}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...NGROK_HEADERS,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      // Timeout (AbortError) or a network-level failure (DNS, connection
      // refused, TLS, the tunnel being down) — the model was unreachable.
      // The model runs on a personal machine over a tunnel, so this must
      // never crash the caller's request.
      this.logger.error(
        `Knowledge-tracing model call to ${path} failed: ${(err as Error).message}`,
      );
      throw apiError(
        'MODEL_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status >= 500) {
      // 502/503/504 — ngrok's own gateway error pages, or the model process
      // itself crashing. Same "unavailable" bucket as a network failure.
      this.logger.error(
        `Knowledge-tracing model call to ${path} failed: HTTP ${res.status}`,
      );
      throw apiError(
        'MODEL_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      // A 2xx/4xx response that isn't valid JSON — most often ngrok's own
      // HTML interstitial slipping through, or the model returning plain
      // text. Treated as "unavailable" since we can't trust the payload.
      this.logger.error(
        `Knowledge-tracing model call to ${path} returned a non-JSON body.`,
      );
      throw apiError(
        'MODEL_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!res.ok) {
      // The model was reached and understood the request, but rejected the
      // *data* (e.g. an interaction name outside its trained vocabulary).
      // This is the caller's mistake, not a service outage — surface the
      // model's own explanation instead of the generic "unavailable"
      // message so it's actually actionable.
      const detail =
        parsed && typeof parsed === 'object' && 'detail' in parsed
          ? String((parsed as { detail: unknown }).detail)
          : `Model API returned HTTP ${res.status}.`;
      throw apiError('MODEL_VALIDATION_ERROR', detail, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    return parsed as T;
  }

  // Model API boc ket qua trong { ket_qua: [...] } / { chu_de_ket_qua: [...] }
  // thay vi tra mang tran -- unwrap ngay tai day de moi noi goi
  // predictStudent/predictClass van nhan dung mang nhu chu ky ham khai bao.
  async predictStudent(interactions: InteractionTuple[]): Promise<StudentStepResult[]> {
    const res = await this.callModel<PredictStudentResponse>(
      '/predict_student',
      { interactions },
      STUDENT_TIMEOUT_MS,
    );
    return res.ket_qua;
  }

  async predictClass(students: ClassStudentInput[]): Promise<ClassTopicReport[]> {
    const res = await this.callModel<PredictClassResponse>(
      '/predict_class',
      { students },
      CLASS_TIMEOUT_MS,
    );
    return res.chu_de_ket_qua;
  }
}
