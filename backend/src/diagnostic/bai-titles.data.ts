// Ten bai chinh thuc theo PPCT Toan 10 (sach Ket noi tri thuc), baiSgk 1-27,
// danh so lien tuc xuyen suot 9 chuong (khong reset lai theo tung chuong).
// Nguon: thuvienhoclieu.com-PPCT-Toan-10-sach-KNTT.docx (Phu luc I, khung ke
// hoach day hoc). Du lieu tinh, khong doi theo nam hoc -- khong can bang DB
// rieng cho 27 dong nay.
export const BAI_TITLES: Record<number, string> = {
  1: 'Mệnh đề',
  2: 'Tập hợp và các phép toán trên tập hợp',
  3: 'Bất phương trình bậc nhất hai ẩn',
  4: 'Hệ bất phương trình bậc nhất hai ẩn',
  5: 'Giá trị lượng giác của một góc từ 0° đến 180°',
  6: 'Hệ thức lượng trong tam giác',
  7: 'Các khái niệm mở đầu',
  8: 'Tổng và hiệu của hai vectơ',
  9: 'Tích của một vectơ với một số',
  10: 'Vectơ trong mặt phẳng toạ độ',
  11: 'Tích vô hướng của hai vectơ',
  12: 'Số gần đúng và sai số',
  13: 'Các số đặc trưng đo xu thế trung tâm',
  14: 'Các số đặc trưng đo độ phân tán',
  15: 'Hàm số',
  16: 'Hàm số bậc hai',
  17: 'Dấu của tam thức bậc hai',
  18: 'Phương trình quy về phương trình bậc hai',
  19: 'Phương trình đường thẳng',
  20: 'Vị trí tương đối giữa hai đường thẳng. Góc và khoảng cách',
  21: 'Đường tròn trong mặt phẳng toạ độ',
  22: 'Ba đường conic',
  23: 'Quy tắc đếm',
  24: 'Hoán vị, chỉnh hợp và tổ hợp',
  25: 'Nhị thức Newton',
  26: 'Biến cố và định nghĩa cổ điển của xác suất',
  27: 'Thực hành tính xác suất theo định nghĩa cổ điển',
};

export function getBaiTitle(baiSgk: number): string | null {
  return BAI_TITLES[baiSgk] ?? null;
}
