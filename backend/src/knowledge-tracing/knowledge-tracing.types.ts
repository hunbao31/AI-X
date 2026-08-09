// Shapes exchanged with the external Neural-Symbolic Knowledge Tracing
// model API (runs on a personal machine behind an ngrok tunnel — see
// KnowledgeTracingService). Field names mirror the model's own Vietnamese
// JSON keys verbatim; do not rename them, the model API itself dictates the
// wire format.

export type InteractionTuple = [exerciseName: string, correct: 0 | 1];

export interface StudentStepResult {
  bai_tap: string;
  phan_tram_hieu: number;
  muc_do: 'Can chu y' | 'Chua chac chan' | 'Co ve vung';
  canh_bao: boolean;
  tien_de_thieu: string[];
}

export interface ClassStudentInput {
  id: string;
  interactions: InteractionTuple[];
}

export interface ClassTopicReport {
  chu_de: string;
  so_hoc_sinh: number;
  ty_le_do: number;
  ty_le_vang: number;
  ty_le_xanh: number;
  // null khi khong co hoc sinh nao co du lieu cho chu de nay (so_hoc_sinh=0).
  muc_do_hieu_trung_binh: number | null;
}

// Model API boc ket qua trong 1 object thay vi tra mang tran -- xem
// KnowledgeTracingService.callModel.
export interface PredictStudentResponse {
  ket_qua: StudentStepResult[];
}

export interface PredictClassResponse {
  chu_de_ket_qua: ClassTopicReport[];
}
