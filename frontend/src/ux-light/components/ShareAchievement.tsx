import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Linkedin, Share2, X } from 'lucide-react';
import { GITHUB_REPO_URL } from '../../config';
import {
  canvasToPngBlob,
  downloadBlob,
  linkedInShareUrl,
  renderShareCard,
  shareText,
  slugifyShareName,
  tweetIntentUrl,
  type SharePayload,
} from '../shareCard';

interface ShareAchievementProps {
  payload: SharePayload;
  onClose: () => void;
  onNext?: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
}

export function ShareAchievement({
  payload,
  onClose,
  onNext,
  nextLabel = 'Next Exercise',
  isNextDisabled,
}: ShareAchievementProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    const canvas = renderShareCard(payload);
    canvasRef.current = canvas;
    const url = canvas.toDataURL('image/png');
    setPreviewUrl(url);
    return () => {
      canvasRef.current = null;
    };
  }, [payload]);

  const filename = `baselayer-${payload.kind}-${slugifyShareName(payload)}.png`;

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    const blob = await canvasToPngBlob(canvasRef.current);
    downloadBlob(blob, filename);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText(payload));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleNativeShare = async () => {
    if (!canvasRef.current || !navigator.share) return;
    const blob = await canvasToPngBlob(canvasRef.current);
    const file = new File([blob], filename, { type: 'image/png' });
    const data: ShareData = {
      title: payload.kind === 'course' ? 'Course complete' : 'Lesson complete',
      text: shareText(payload),
      url: GITHUB_REPO_URL,
    };
    if (navigator.canShare?.({ files: [file] })) {
      data.files = [file];
    }
    try {
      await navigator.share(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  };

  const heading = payload.kind === 'course' ? 'Course complete — share it' : 'Lesson complete — share it';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05192d]/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1d3952] bg-[#0b2338] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d3952]">
          <div>
            <h2 className="text-base font-extrabold text-white">{heading}</h2>
            <p className="text-xs text-[#93a3b4] mt-0.5">Card links to the GitHub repo. Attach the image on X or LinkedIn.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#93a3b4] hover:text-white hover:bg-[#1d3952]"
            aria-label="Close share dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Share card preview"
              className="w-full rounded-xl border border-[#1d3952] shadow-lg"
            />
          )}

          {payload.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {payload.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#03ef62]/15 text-[#03ef62] border border-[#03ef62]/40"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href={tweetIntentUrl(payload)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white text-[#05192d] text-xs font-bold hover:bg-[#e2e8ee]"
            >
              <span className="font-black">𝕏</span>
              Post
            </a>
            <a
              href={linkedInShareUrl()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0a66c2] text-white text-xs font-bold hover:bg-[#084e96]"
            >
              <Linkedin size={14} />
              LinkedIn
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#05192d] text-white text-xs font-bold border border-[#1d3952] hover:bg-[#15324d]"
            >
              {copied ? <Check size={14} className="text-[#03ef62]" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#05192d] text-white text-xs font-bold border border-[#1d3952] hover:bg-[#15324d]"
            >
              <Download size={14} />
              Save image
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#03ef62]/50 text-[#03ef62] text-xs font-bold hover:bg-[#03ef62]/10"
              >
                <Share2 size={14} />
                Share image
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                disabled={isNextDisabled}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#03ef62] hover:bg-[#02c852] disabled:opacity-40 text-[#05192d] font-bold text-xs"
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
