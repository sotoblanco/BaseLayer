import { GITHUB_REPO_LABEL, GITHUB_REPO_URL } from '../config';

export type ShareKind = 'lesson' | 'course';

export interface SharePayload {
  kind: ShareKind;
  courseTitle: string;
  lessonTitle?: string;
  skills: string[];
}

const WIDTH = 1200;
const HEIGHT = 630;
const NAVY = '#05192d';
const GREEN = '#03ef62';
const WHITE = '#f4f6f8';
const MUTED = '#93a3b4';

export function shareText(payload: SharePayload): string {
  const skillsLine = payload.skills.length
    ? `\n\nSkills: ${payload.skills.join(' · ')}`
    : '';
  if (payload.kind === 'course') {
    return `I finished ${payload.courseTitle} on BaseLayer.${skillsLine}\n\nLearn by doing: ${GITHUB_REPO_URL}`;
  }
  const lesson = payload.lessonTitle || 'a lesson';
  return `I just completed “${lesson}” in ${payload.courseTitle} on BaseLayer.${skillsLine}\n\nLearn by doing: ${GITHUB_REPO_URL}`;
}

export function tweetIntentUrl(payload: SharePayload): string {
  const params = new URLSearchParams({ text: shareText(payload) });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function linkedInShareUrl(): string {
  const params = new URLSearchParams({ url: GITHUB_REPO_URL });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function drawPills(
  ctx: CanvasRenderingContext2D,
  skills: string[],
  startX: number,
  startY: number,
  maxWidth: number
) {
  let x = startX;
  let y = startY;
  const rowH = 52;
  ctx.font = '600 22px ui-sans-serif, system-ui, sans-serif';
  for (const skill of skills.slice(0, 8)) {
    const w = Math.ceil(ctx.measureText(skill).width) + 36;
    if (x + w > startX + maxWidth && x > startX) {
      x = startX;
      y += rowH;
    }
    roundRect(ctx, x, y, w, 40, 20);
    ctx.fillStyle = 'rgba(3, 239, 98, 0.12)';
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = GREEN;
    ctx.fillText(skill, x + 18, y + 28);
    x += w + 12;
  }
}

export function renderShareCard(payload: SharePayload): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, 18, HEIGHT);

  ctx.font = '700 28px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = GREEN;
  ctx.fillText('BASELAYER', 64, 72);

  ctx.font = '600 22px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = MUTED;
  const badge = payload.kind === 'course' ? 'COURSE COMPLETE' : 'LESSON COMPLETE';
  const badgeW = ctx.measureText(badge).width + 36;
  roundRect(ctx, WIDTH - 64 - badgeW, 42, badgeW, 40, 20);
  ctx.fillStyle = 'rgba(3, 239, 98, 0.15)';
  ctx.fill();
  ctx.fillStyle = GREEN;
  ctx.fillText(badge, WIDTH - 64 - badgeW + 18, 70);

  ctx.font = '600 26px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText(payload.courseTitle, 64, 170);

  ctx.font = '800 56px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = WHITE;
  const headline =
    payload.kind === 'course'
      ? `Finished ${payload.courseTitle}`
      : payload.lessonTitle || 'Lesson complete';
  const lines = wrapText(ctx, headline, WIDTH - 128);
  lines.forEach((line, i) => ctx.fillText(line, 64, 250 + i * 66));

  const skillsY = 250 + lines.length * 66 + 24;
  if (payload.skills.length) {
    ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText('SKILLS GAINED', 64, skillsY);
    drawPills(ctx, payload.skills, 64, skillsY + 18, WIDTH - 128);
  }

  ctx.font = '600 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = GREEN;
  ctx.fillText(GITHUB_REPO_LABEL, 64, HEIGHT - 48);

  ctx.font = '500 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = MUTED;
  ctx.fillText('Learn by doing', 64, HEIGHT - 80);

  return canvas;
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not export share image');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function slugifyShareName(payload: SharePayload): string {
  const raw = payload.kind === 'course' ? payload.courseTitle : payload.lessonTitle || 'lesson';
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lesson';
}
