// Excel で開ける CSV（BOM 付き UTF-8）を返す
export function csvResponse(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Excel での数式実行（CSV インジェクション）を防ぐため、先頭が = + - @ の値はエスケープする
function csvCell(v: string) {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}
