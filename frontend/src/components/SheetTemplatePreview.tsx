/**
 * Static read-only preview of a declarative sheet template (Issue #108).
 *
 * Renders the lesson's `sheet.cells` A1 map as a plain grid when no live
 * Google Sheet exists yet (template not provisioned, or no credentials).
 * Values render as-is; `=FORMULAS` render in mono so learners can read them.
 * This is a preview, not an editor: filling and grading still happen in a
 * provisioned Google Sheet copy.
 */

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

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

/**
 * Converts a { A1: value } map into TSV (tab-separated values) text.
 * When pasted into cell A1 in Google Sheets, it cleanly populates the exact
 * cells and evaluates any string starting with "=" as a live formula.
 */
export function cellsToTsv(cells: Record<string, CellValue>): string {
  const entries: Array<{ row: number; col: number; value: CellValue }> = [];
  for (const [key, value] of Object.entries(cells ?? {})) {
    const pos = splitCell(key);
    if (pos) entries.push({ ...pos, value });
  }
  if (entries.length === 0) return '';
  const maxRow = Math.max(...entries.map((e) => e.row));
  const maxCol = Math.max(...entries.map((e) => e.col));
  const grid = new Map<string, CellValue>();
  for (const e of entries) grid.set(`${e.row}:${e.col}`, e.value);

  const lines: string[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const rowCells: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const val = grid.get(`${r}:${c}`);
      rowCells.push(val !== undefined ? String(val) : '');
    }
    lines.push(rowCells.join('\t'));
  }
  return lines.join('\n');
}

export default function SheetTemplatePreview({ cells }: { cells: Record<string, CellValue> }) {
  const [copied, setCopied] = useState(false);

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

  const handleCopyAndOpen = async () => {
    try {
      const tsv = cellsToTsv(cells);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      window.open('https://sheets.new', '_blank');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy sheet data', err);
    }
  };

  const handleCopyOnly = async () => {
    try {
      const tsv = cellsToTsv(cells);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy sheet data', err);
    }
  };

  return (
    <div className="flex flex-col items-start gap-3 p-4 overflow-auto h-full">
      {/* Easy Copy-Paste Instructions Card */}
      <div className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Quick Setup (No Cloud Setup Required)
            </span>
          </div>
          <p className="text-xs text-slate-300">
            1. Click <b>Copy & open sheets.new</b> &bull; 2. Paste (Ctrl+V/Cmd+V) in <b>cell A1</b> &bull; 3. Paste your sheet link in the top bar.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleCopyAndOpen}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow shadow-emerald-900/40"
          >
            {copied ? <Check size={14} className="text-white" /> : <ExternalLink size={14} />}
            {copied ? 'Copied! Paste in A1' : 'Copy & open sheets.new'}
          </button>
          <button
            onClick={handleCopyOnly}
            title="Copy table data only"
            className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-600"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <table className="border-collapse text-xs font-mono rounded-lg overflow-hidden shadow-md">
        <thead>
          <tr>
            <th className="border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-400" />
            {Array.from({ length: maxCol + 1 }, (_, c) => (
              <th key={c} className="border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-300 font-semibold">
                {columnLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRow + 1 }, (_, r) => (
            <tr key={r}>
              <td className="border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-400 text-center font-semibold">
                {r + 1}
              </td>
              {Array.from({ length: maxCol + 1 }, (_, c) => {
                const value = grid.get(`${r}:${c}`);
                const isFormula = typeof value === 'string' && value.startsWith('=');
                return (
                  <td
                    key={c}
                    className={`border border-slate-700/80 px-3 py-1.5 ${
                      value === undefined || value === ''
                        ? 'bg-slate-900/30 text-transparent'
                        : isFormula
                          ? 'bg-amber-500/10 text-amber-300 font-bold'
                          : 'bg-slate-800/40 text-slate-100'
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
