'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

type AdminAttemptType = 'luyen_tap' | 'bo_de' | 'chan_doan';

interface AdminAttemptRow {
  loai: AdminAttemptType;
  loaiNhan: string;
  hocSinh: string;
  tenBai: string;
  ketQua: string;
  thoiGian: string;
  maKyNang: string | null;
  doKho: string | null;
  dapAnHocSinh: string | null;
  dapAnDung: string | null;
  thoiGianLamGiay: number | null;
}

// '—' cho cac o khong ap dung (vd bo_de la 1 lot nhieu cau, khong co 1 dap
// an/do kho duy nhat) -- day la bang du lieu tho kieu problem log, khong an
// bot cot rong.
function cell(value: string | number | null): string {
  return value === null || value === '' ? '—' : String(value);
}

const LOAI_TONE: Record<AdminAttemptType, 'indigo' | 'yellow' | 'green'> = {
  luyen_tap: 'indigo',
  bo_de: 'yellow',
  chan_doan: 'green',
};

const LOAI_FILTERS: { value: AdminAttemptType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'luyen_tap', label: 'Luyện tập' },
  { value: 'bo_de', label: 'Bộ đề' },
  { value: 'chan_doan', label: 'Chẩn đoán AI' },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminAttemptsPage() {
  const [rows, setRows] = useState<AdminAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<AdminAttemptType | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet<AdminAttemptRow[]>('/api/v1/admin/attempts')
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách lượt làm bài.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.loai !== filter) return false;
      if (q && !r.hocSinh.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Lượt làm bài của học sinh</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gộp cả 3 nguồn — luyện tập, bộ đề, chẩn đoán AI — sắp xếp theo thời gian mới nhất.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {LOAI_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                filter === f.value
                  ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên học sinh…"
          className="input-base ml-auto max-w-xs"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            {rows.length === 0
              ? 'Chưa có lượt làm bài nào trong hệ thống.'
              : 'Không có lượt làm bài nào khớp với bộ lọc hiện tại.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Học sinh</th>
                <th className="px-4 py-3 font-medium">Tên bài</th>
                <th className="px-4 py-3 font-medium">Mã kỹ năng</th>
                <th className="px-4 py-3 font-medium">Độ khó</th>
                <th className="px-4 py-3 font-medium">Đáp án học sinh</th>
                <th className="px-4 py-3 font-medium">Đáp án đúng</th>
                <th className="px-4 py-3 font-medium">Kết quả</th>
                <th className="px-4 py-3 font-medium">Thời gian làm (giây)</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr
                  key={`${row.loai}-${row.hocSinh}-${row.thoiGian}-${i}`}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <Badge tone={LOAI_TONE[row.loai]}>{row.loaiNhan}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{row.hocSinh}</td>
                  <td className="max-w-md truncate px-4 py-3 text-slate-300">{row.tenBai}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">
                    {cell(row.maKyNang)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{cell(row.doKho)}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-slate-300">
                    {cell(row.dapAnHocSinh)}
                  </td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-slate-300">
                    {cell(row.dapAnDung)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.ketQua}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {cell(row.thoiGianLamGiay)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                    {formatTime(row.thoiGian)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
