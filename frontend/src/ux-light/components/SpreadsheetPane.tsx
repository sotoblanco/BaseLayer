import { CheckCircle2, ExternalLink, Link, Loader2, Trash2, XCircle } from 'lucide-react';
import type { FileLesson, SpreadsheetVerification } from '../types';

interface SpreadsheetPaneProps {
  lesson: FileLesson;
  userSheetUrl: string;
  onChangeUrl: (url: string) => void;
  onVerify: (sheetUrl: string) => void;
  isVerifying: boolean;
  verification: SpreadsheetVerification | null;
  verifyError: string | null;
  onMarkComplete?: () => void;
  isComplete?: boolean;
}

function extractSheetId(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function SpreadsheetPane({
  lesson,
  userSheetUrl,
  onChangeUrl,
  onVerify,
  isVerifying,
  verification,
  verifyError,
  onMarkComplete,
  isComplete,
}: SpreadsheetPaneProps) {
  const displaySheetId = userSheetUrl ? extractSheetId(userSheetUrl) : lesson.google_sheet_id;
  const isUsingPersonalCopy = !!(userSheetUrl && extractSheetId(userSheetUrl));
  const iframeUrl = displaySheetId
    ? `https://docs.google.com/spreadsheets/d/${displaySheetId}/edit?usp=sharing`
    : '';

  const hasChecks = (lesson.success_cells ?? []).length > 0;
  const hasCopyLink = !!userSheetUrl && !!extractSheetId(userSheetUrl);
  const passed = verification?.passed ?? false;
  const checks = verification?.checks ?? [];

  const showFeedback = isVerifying || !!verification || !!verifyError;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-[#05192d]">
      <div className="h-12 border-b border-[#1d3952] flex items-center px-3 sm:px-4 bg-[#0b2338] justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-[#93a3b4] whitespace-nowrap">
            {isUsingPersonalCopy ? 'My Copy' : 'Template'}
          </span>
          <div className="flex-1 max-w-lg flex items-center gap-2 bg-[#05192d] border border-[#1d3952] rounded px-2 py-1">
            <Link size={14} className="text-[#5b6b7b] shrink-0" />
            <input
              type="text"
              placeholder="Paste your private copy link..."
              className="bg-transparent border-none text-xs text-[#e6edf3] w-full focus:outline-none"
              value={userSheetUrl}
              onChange={(e) => onChangeUrl(e.target.value)}
            />
            {userSheetUrl && (
              <button
                onClick={() => onChangeUrl('')}
                className="text-[#5b6b7b] hover:text-[#ff6b6b]"
                title="Remove link"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lesson.copy_on_open && lesson.google_sheet_id && (
            <button
              onClick={() =>
                window.open(`https://docs.google.com/spreadsheets/d/${lesson.google_sheet_id}/copy`, '_blank')
              }
              className="flex items-center gap-2 px-3 py-1.5 bg-[#03ef62] hover:bg-[#02c852] rounded text-[#05192d] text-xs font-bold"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Make a private copy</span>
            </button>
          )}
          {hasChecks && (
            <button
              onClick={() => onVerify(userSheetUrl)}
              disabled={isVerifying || !hasCopyLink || passed}
              title={
                hasCopyLink
                  ? 'Verify the target cells in your copy'
                  : 'Paste your copy link first'
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold shrink-0 disabled:opacity-50 bg-[#0b2338] text-[#ffb800] border border-[#ffb800]/40 hover:bg-[#ffb800]/20"
            >
              {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {isVerifying ? 'Checking...' : passed ? 'Checked' : 'Check my work'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white">
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-none"
            title="Google Sheet Exercise"
            allow="autorepair;usercopy;useredit"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#5b6b7b] italic text-sm">
            Sheet ID not found in metadata...
          </div>
        )}
      </div>

      {showFeedback && (
        <div className="shrink-0 max-h-40 overflow-y-auto custom-scrollbar border-t border-[#1d3952] bg-[#0b2338] px-4 py-2.5">
          {isVerifying ? (
            <p className="text-xs text-[#93a3b4] italic flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" /> Checking the target cells in your copy...
            </p>
          ) : verification ? (
            <div className="space-y-1.5">
              <p className={`text-xs font-bold flex items-center gap-1.5 ${passed ? 'text-[#03ef62]' : 'text-[#ffb800]'}`}>
                {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {verification.message}
              </p>
              {checks.length > 0 && (
                <ul className="space-y-1">
                  {checks.map((check) => (
                    <li key={check.cell} className="flex items-start gap-2 text-xs font-mono">
                      {check.ok ? (
                        <CheckCircle2 size={13} className="text-[#03ef62] shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={13} className="text-[#ff6b6b] shrink-0 mt-0.5" />
                      )}
                      <span className={check.ok ? 'text-[#e6edf3]' : 'text-[#ffb800]'}>
                        {check.cell}:
                      </span>
                      {check.ok ? (
                        <span className="text-[#93a3b4]">{check.actual}</span>
                      ) : (
                        <span className="text-[#e6edf3]">
                          expected {check.expected}
                          {check.actual !== null ? `, found ${check.actual}` : ' (empty)'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {onMarkComplete && !passed && (
                <button
                  onClick={onMarkComplete}
                  disabled={isComplete}
                  className="mt-1.5 text-[10px] uppercase tracking-widest font-bold text-[#5b6b7b] hover:text-[#93a3b4] disabled:opacity-50 underline underline-offset-2"
                >
                  {isComplete ? 'Complete' : 'I fixed the cells myself — mark complete'}
                </button>
              )}
            </div>
          ) : verifyError ? (
            <div className="space-y-1.5">
              <p className="text-xs text-[#ffb800] flex items-start gap-1.5">{verifyError}</p>
              {onMarkComplete && !isComplete && (
                <button
                  onClick={onMarkComplete}
                  className="text-[10px] uppercase tracking-widest font-bold text-[#5b6b7b] hover:text-[#93a3b4] underline underline-offset-2"
                >
                  I verified it myself — mark complete
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!showFeedback && !hasChecks && onMarkComplete && (
        <div className="shrink-0 border-t border-[#1d3952] bg-[#0b2338] px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#93a3b4] italic">
            This lesson has no automatic cell checks yet — review your sheet against the task, then
            mark it complete.
          </p>
          <button
            onClick={onMarkComplete}
            disabled={isComplete}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold shrink-0 disabled:opacity-70 bg-[#0b3323] text-[#03ef62] border border-[#03ef62]/40 hover:bg-[#0e3d2a]"
          >
            <CheckCircle2 size={14} />
            <span className="hidden sm:inline">{isComplete ? 'Complete' : 'Mark complete'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
