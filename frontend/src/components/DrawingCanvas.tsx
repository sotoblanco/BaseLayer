import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Undo2 } from 'lucide-react';

interface DrawingCanvasProps {
    imageUrl: string;
    strokeColor?: string;
    strokeWidth?: number;
    onCanvasRef?: (ref: HTMLCanvasElement | null) => void;
}

type Tool = 'pencil' | 'eraser';

export default function DrawingCanvas({
    imageUrl,
    strokeColor = '#e11d48',
    strokeWidth = 4,
    onCanvasRef,
}: DrawingCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);  // background image
    const drawCanvasRef = useRef<HTMLCanvasElement>(null); // user strokes
    const [activeTool, setActiveTool] = useState<Tool>('pencil');
    const [currentColor, setCurrentColor] = useState(strokeColor);
    const [currentWidth, setCurrentWidth] = useState(strokeWidth);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [aspectRatio, setAspectRatio] = useState<number | undefined>();
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    // Load background image
    useEffect(() => {
        const bgCanvas = bgCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;
        if (!bgCanvas || !drawCanvas) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            bgCanvas.width = img.naturalWidth;
            bgCanvas.height = img.naturalHeight;
            drawCanvas.width = img.naturalWidth;
            drawCanvas.height = img.naturalHeight;
            setAspectRatio(img.naturalWidth / img.naturalHeight);

            const ctx = bgCanvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
        };
        img.onerror = () => console.error('Failed to load image:', imageUrl);
        img.src = imageUrl;
    }, [imageUrl]);

    // Expose the draw canvas ref for submission
    useEffect(() => {
        onCanvasRef?.(drawCanvasRef.current);
    }, [onCanvasRef]);

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = drawCanvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const saveHistory = useCallback(() => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        setHistory(prev => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        saveHistory();
        isDrawing.current = true;
        lastPos.current = getPos(e);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current || !lastPos.current) return;
        const canvas = drawCanvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e);

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : currentColor;
        ctx.lineWidth = activeTool === 'eraser' ? currentWidth * 4 : currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.stroke();
        lastPos.current = pos;
    };

    const handlePointerUp = () => {
        isDrawing.current = false;
        lastPos.current = null;
        const canvas = drawCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d')!;
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const handleUndo = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas || history.length === 0) return;
        const ctx = canvas.getContext('2d')!;
        const prev = history[history.length - 1];
        ctx.putImageData(prev, 0, 0);
        setHistory(h => h.slice(0, -1));
    };

    const handleClear = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        saveHistory();
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const toolBtn = (tool: Tool, icon: React.ReactNode, label: string) => (
        <button
            title={label}
            onClick={() => setActiveTool(tool)}
            className={`p-2 rounded-lg transition-all ${activeTool === tool
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-[#1a1a2e] overflow-hidden min-h-0">
            {/* Toolbar */}
            <div className="h-12 flex items-center gap-3 px-4 bg-[#252526] border-b border-[#333] shrink-0">
                {toolBtn('pencil', <Pencil size={16} />, 'Pencil')}
                {toolBtn('eraser', <Eraser size={16} />, 'Eraser')}

                <div className="w-px h-6 bg-slate-700" />

                <label title="Stroke color" className="flex items-center gap-1 cursor-pointer">
                    <div
                        className="w-6 h-6 rounded border-2 border-slate-600"
                        style={{ backgroundColor: currentColor }}
                    />
                    <input
                        type="color"
                        value={currentColor}
                        onChange={e => setCurrentColor(e.target.value)}
                        className="sr-only"
                    />
                </label>

                <label title="Stroke width" className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>Size</span>
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={currentWidth}
                        onChange={e => setCurrentWidth(Number(e.target.value))}
                        className="w-20 accent-emerald-500"
                    />
                    <span className="w-4 text-center">{currentWidth}</span>
                </label>

                <div className="w-px h-6 bg-slate-700" />

                <button
                    title="Undo"
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-all"
                >
                    <Undo2 size={16} />
                </button>
                <button
                    title="Clear canvas"
                    onClick={handleClear}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all"
                >
                    <Trash2 size={16} />
                </button>

                <span className="ml-auto text-xs text-slate-500 italic">
                    {activeTool === 'eraser' ? '🧹 Erasing' : '✏️ Drawing'}
                </span>
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden flex items-center justify-center p-2 min-h-0"
                style={{ background: 'repeating-conic-gradient(#1e1e2e 0% 25%, #252535 0% 50%) 0 0 / 20px 20px' }}
            >
                <div 
                    className="relative shadow-2xl shadow-black/50 rounded-lg overflow-hidden flex-shrink-0 bg-white" 
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        aspectRatio: aspectRatio,
                    }}
                >
                    {/* Background image canvas */}
                    <canvas
                        ref={bgCanvasRef}
                        className="block w-full h-full"
                    />
                    {/* Drawing canvas (transparent overlay) */}
                    <canvas
                        ref={drawCanvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{
                            cursor: activeTool === 'eraser' ? 'cell' : 'crosshair',
                            touchAction: 'none',
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    />
                </div>
            </div>
        </div>
    );
}
