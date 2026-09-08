/**
 * Static read-only preview of a declarative sheet template (Issue #108).
 *
 * Renders the lesson's `sheet.cells` A1 map as a plain grid when no live
 * Google Sheet exists yet (template not provisioned, or no credentials).
 * Values render as-is; `=FORMULAS` render in mono so learners can read them.
 * This is a preview, not an editor: filling and grading still happen in a
 * provisioned Google Sheet copy.
 */

type CellValue = string | number | boolean;

function splitCell(cell: string): { row: number; col: number } | null {
  const match = /^([A-Z]{1,3})([1-9][0-9]*)$/.exec(cell.trim().toUpperCase());
  if (!match) return null;
  let col = 0;
  for (const char of match[1]) col = col * 26 + (char.charCodeAt(0) - 64);
  return { row: parseInt(match[2], 10) - 1, col: col - 1 };
}

function columnLabel(index: number): string {
  let label = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export default function SheetTemplatePreview({ cells }: { cells: Record<string, CellValue> }) {
  const entries: Array<{ row: number; col: number; value: CellValue }> = [];
  for (const [key, value] of Object.entries(cells ?? {})) {
    const pos = splitCell(key);
    if (pos) entries.push({ ...pos, value });
  }
  if (entries.length === 0) return null;

  const maxRow = Math.max(...entries.map((e) => e.row));
  const maxCol = Math.max(...entries.map((e) => e.col));
  const grid = new Map<string, CellValue>();
  for (const e of entries) grid.set(`${e.row}:${e.col}`, e.value);

  return (
    <div className="flex flex-col items-start gap-2 p-4 overflow-auto h-full">
      <p className="text-xs italic opacity-70">
        Template preview from the lesson definition — ask an admin to provision the live
        sheet to fill and check it.
      </p>
      <table className="border-collapse text-xs font-mono">
        <thead>
          <tr>
            <th className="border border-slate-600 bg-slate-800 px-2 py-1" />
            {Array.from({ length: maxCol + 1 }, (_, c) => (
              <th key={c} className="border border-slate-600 bg-slate-800 px-2 py-1 text-slate-300">
                {columnLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRow + 1 }, (_, r) => (
            <tr key={r}>
              <td className="border border-slate-600 bg-slate-800 px-2 py-1 text-slate-300">{r + 1}</td>
              {Array.from({ length: maxCol + 1 }, (_, c) => {
                const value = grid.get(`${r}:${c}`);
                const isFormula = typeof value === 'string' && value.startsWith('=');
                return (
                  <td
                    key={c}
                    className={`border border-slate-600 px-2 py-1 ${
                      value === undefined || value === ''
                        ? 'bg-transparent'
                        : isFormula
                          ? 'bg-amber-500/10 text-amber-200'
                          : 'bg-slate-700/60 text-slate-100'
                    }`}
                  >
                    {value === undefined ? '' : String(value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
