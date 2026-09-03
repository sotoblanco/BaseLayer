import { Link, Trash2, ExternalLink } from 'lucide-react';
import type { FileLesson } from '../types';

interface SpreadsheetPaneProps {
  lesson: FileLesson;
  userSheetUrl: string;
  onChangeUrl: (url: string) => void;
}

function extractSheetId(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function SpreadsheetPane({ lesson, userSheetUrl, onChangeUrl }: SpreadsheetPaneProps) {
  const displaySheetId = userSheetUrl ? extractSheetId(userSheetUrl) : lesson.google_sheet_id;
  const isUsingPersonalCopy = !!(userSheetUrl && extractSheetId(userSheetUrl));
  const iframeUrl = displaySheetId
    ? `https://docs.google.com/spreadsheets/d/${displaySheetId}/edit?usp=sharing`
    : '';

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
              <button onClick={() => onChangeUrl('')} className="text-[#5b6b7b] hover:text-[#ff6b6b]" title="Remove link">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {lesson.copy_on_open && lesson.google_sheet_id && (
          <button
            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${lesson.google_sheet_id}/copy`, '_blank')}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#03ef62] hover:bg-[#02c852] rounded text-[#05192d] text-xs font-bold shrink-0"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Make a private copy</span>
          </button>
        )}
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
    </div>
  );
}
