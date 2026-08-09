import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { apiError } from '../common/api-envelope';

// Chay tren may ca nhan, ket noi qua ngrok tunnel giong KT model service --
// xem knowledge-tracing.service.ts, cung quy uoc: URL xoay vong moi lan
// tunnel khoi dong lai, khong hardcode o dau ca.
const PHOBERT_API_URL = process.env.PHOBERT_API_URL;
const TIMEOUT_MS = Number(process.env.PHOBERT_API_TIMEOUT_MS ?? 30_000);

const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

const UNAVAILABLE_MESSAGE =
  'Không kết nối được với hệ thống chấm câu tự luận, thử lại sau';

interface SimilarityResponse {
  similarity_score: number;
  bi_cat_ngan: boolean;
}

// CHI tra ve diem so tho -- KHONG suy ra dung/sai. Thuc nghiem (xem lich su
// trao doi Buoc 2) cho thay 1 cau SAI ban chat (dao nguoc ket luan, dung tu
// vung gan giong dap an) van co the cho similarity CAO HON ca cau dung that
// -- similarity thuan tuy KHONG dang tin de lam tin hieu quyet dinh. Diem
// nay chi luu lai de phan tich/nghien cuu sau nay, khong bao gio dung de
// tinh correct hay hien thi "goi y dung/sai" cho giao vien.
@Injectable()
export class PhobertSimilarityService {
  private readonly logger = new Logger(PhobertSimilarityService.name);

  async computeSimilarity(cauTraLoi: string, dapAnMau: string): Promise<SimilarityResponse> {
    if (!PHOBERT_API_URL) {
      this.logger.error('PHOBERT_API_URL is not set.');
      throw apiError(
        'PHOBERT_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${PHOBERT_API_URL}/similarity`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...NGROK_HEADERS },
        body: JSON.stringify({ cau_tra_loi: cauTraLoi, dap_an_mau: dapAnMau }),
        signal: controller.signal,
      });
    } catch (err) {
      this.logger.error(`PhoBERT similarity call failed: ${(err as Error).message}`);
      throw apiError(
        'PHOBERT_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      this.logger.error(`PhoBERT similarity call failed: HTTP ${res.status}`);
      throw apiError(
        'PHOBERT_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      return (await res.json()) as SimilarityResponse;
    } catch {
      this.logger.error('PhoBERT similarity call returned a non-JSON body.');
      throw apiError(
        'PHOBERT_API_UNAVAILABLE',
        UNAVAILABLE_MESSAGE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
