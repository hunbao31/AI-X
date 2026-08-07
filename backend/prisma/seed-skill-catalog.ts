// Sinh/cap nhat bang SkillCatalog trong DB tu 2 nguon tho: exchiatheobai1 (2).xlsx
// (vn_name, chuong/bai SGK -- ban da sua loi moi nhat: equation_of_a_line ->
// chuong 7/bai 19/vn_topic=duong thang, parallel_lines_1 -> vn_name dung) va
// rule_weights_150.csv (priorityTier, dem so lan moi ky nang xuat hien lam
// Exercise_A = tien de cho ky nang khac).
//
// Danh sach 150 skillCode CHINH THUC: xlsx co 153 dong nhung
// graphing_linear_equations bi lap 3 dong giong het nhau -- dedupe theo
// 'name' (giu dong dau) con 151, roi loai 'common_factors_of_a_polynomial_2'
// (bai da thuc, khong thuoc pham vi 150 bai chinh thuc) con dung 150.
//
// QUAN TRONG: dung UPSERT (update neu skillCode da ton tai, insert neu chua)
// -- KHONG xoa sach bang roi chen lai, vi day la DB dung chung (Neon) va
// DiagnosticExercise (cau hoi giao vien da soan) tham chieu toi skillCode o
// day; xoa sach se khong lam mat DiagnosticExercise (FK chi la string tu do,
// khong phai foreign key thuc su) nhung se lam gian doan du lieu SkillCatalog
// trong luc seed dang chay va mat lich su updatedAt/createdAt cua cac dong
// khong doi.
//
// Chay: npm run seed:skill-catalog

import { PrismaClient, PriorityTier } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const XLSX_PATH = path.join(__dirname, 'seed-data', 'exchiatheobai1 (2).xlsx');
const RULE_WEIGHTS_PATH = path.join(__dirname, 'seed-data', 'rule_weights_150.csv');
const EXCLUDED_SKILL_CODE = 'common_factors_of_a_polynomial_2';

interface XlsxRow {
  name: string;
  vn_name: string | null;
  chuongSgk: string;
  baiSgk: number;
}

function loadXlsxRows(): XlsxRow[] {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const seen = new Set<string>();
  const result: XlsxRow[] = [];
  for (const row of rows) {
    const name = String(row['name']).trim();
    if (seen.has(name)) continue; // dedupe -- vd graphing_linear_equations lap 3 dong
    if (name === EXCLUDED_SKILL_CODE) continue;
    seen.add(name);

    const vnNameRaw = row['vn_name'];
    result.push({
      name,
      vn_name: vnNameRaw === null || String(vnNameRaw).trim() === '' ? null : String(vnNameRaw),
      chuongSgk: String(row['chương trong sgk']).trim(),
      baiSgk: Number(row['bài trong sgk']),
    });
  }
  return result;
}

function countPrereqOccurrences(): Map<string, number> {
  const csv = fs.readFileSync(RULE_WEIGHTS_PATH, 'utf-8');
  const lines = csv.trim().split('\n');
  const header = lines[0].split(',');
  const aIdx = header.indexOf('Exercise_A');
  if (aIdx === -1) {
    throw new Error(`Khong tim thay cot Exercise_A trong ${RULE_WEIGHTS_PATH}`);
  }

  const counts = new Map<string, number>();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const exerciseA = line.split(',')[aIdx].trim();
    counts.set(exerciseA, (counts.get(exerciseA) ?? 0) + 1);
  }
  return counts;
}

function tierFromCount(count: number): PriorityTier {
  if (count >= 4) return PriorityTier.cao;
  if (count >= 1) return PriorityTier.trung_binh;
  return PriorityTier.thap;
}

async function main() {
  const xlsxRows = loadXlsxRows();
  if (xlsxRows.length !== 150) {
    throw new Error(`SAI: ${xlsxRows.length} dong sau dedupe+loc, khong phai 150`);
  }
  const prereqCounts = countPrereqOccurrences();

  const records = xlsxRows.map((row) => {
    const prereqCount = prereqCounts.get(row.name) ?? 0;
    const needsVnName = row.vn_name === null;
    return {
      skillCode: row.name,
      vnName: needsVnName ? row.name : row.vn_name!,
      chuongSgk: row.chuongSgk,
      baiSgk: row.baiSgk,
      priorityTier: tierFromCount(prereqCount),
      needsVnName,
      prereqCount,
    };
  });

  console.log(`Da tinh ${records.length} ky nang tu exchiatheobai1 (2).xlsx + rule_weights_150.csv.`);

  // UPSERT tung dong (khong deleteMany+createMany) -- an toan cho DB dung
  // chung, giu nguyen cac dong khong doi va khong lam gian doan du lieu.
  await prisma.$transaction(
    records.map((r) =>
      prisma.skillCatalog.upsert({
        where: { skillCode: r.skillCode },
        update: {
          vnName: r.vnName,
          chuongSgk: r.chuongSgk,
          baiSgk: r.baiSgk,
          priorityTier: r.priorityTier,
          needsVnName: r.needsVnName,
          prereqCount: r.prereqCount,
        },
        create: r,
      }),
    ),
  );

  const countByTier = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.priorityTier] = (acc[r.priorityTier] ?? 0) + 1;
    return acc;
  }, {});
  const needsVnNameCount = records.filter((r) => r.needsVnName).length;

  console.log(`Da upsert xong bang SkillCatalog: ${records.length} dong.`);
  console.log('Phan bo priorityTier:', countByTier);
  console.log(`So bai fallback needsVnName=true: ${needsVnNameCount}`);

  console.log('\n--- Mau du lieu de xac nhan ---');
  const sampleCao = records.find((r) => r.priorityTier === 'cao');
  const sampleTrungBinh = records.find((r) => r.priorityTier === 'trung_binh');
  const sampleFallback = records.find((r) => r.needsVnName);
  const equationOfALine = records.find((r) => r.skillCode === 'equation_of_a_line');
  const parallelLines1 = records.find((r) => r.skillCode === 'parallel_lines_1');
  for (const [label, rec] of [
    ['priorityTier=cao', sampleCao],
    ['priorityTier=trung_binh', sampleTrungBinh],
    ['needsVnName=true (fallback)', sampleFallback],
    ['equation_of_a_line (da sua)', equationOfALine],
    ['parallel_lines_1 (da sua)', parallelLines1],
  ] as const) {
    console.log(`\n[${label}]`);
    console.log(JSON.stringify(rec, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
