import { redirect } from 'next/navigation';

// Luồng Exercise tự do đã đóng; trang tạo cũ chuyển thẳng sang ngân hàng
// Diagnostic, nơi câu hỏi luôn được gắn skillCode theo Chương/Bài SGK.
export default function TeacherCreatePage() {
  redirect('/teacher/diagnostic');
}
