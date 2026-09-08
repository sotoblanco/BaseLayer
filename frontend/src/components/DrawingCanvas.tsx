import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Undo2, ZoomIn, ZoomOut, ArrowRight, Type, GripHorizontal } from 'lucide-react';

interface DrawingCanvasProps {
    imageUrl?: string;
    strokeColor?: string;
    strokeWidth?: number;
    boardTheme?: 'default' | 'chalkboard';
    promptText?: string;
    onCanvasRef?: (ref: HTMLCanvasElement | null) => void;
}

type Tool = 'pencil' | 'eraser' | 'arrow' | 'text';

const CHALK_COLORS = [
    { label: 'White', color: '#f8fafc' },
    { label: 'Yellow', color: '#fde047' },
    { label: 'Cyan', color: '#7dd3fc' },
    { label: 'Pink', color: '#f472b6' },
    { label: 'Mint', color: '#86efac' },
    { label: 'Orange', color: '#fb923c' },
];

function renderChalkboard(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    promptText?: string
) {
    // 1. Base dark green chalkboard slate gradient
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.2,
        width / 2, height / 2, Math.max(width, height) * 0.75
    );
    gradient.addColorStop(0, '#234735');
    gradient.addColorStop(0.65, '#1b3829');
    gradient.addColorStop(1, '#11251b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Faint grid guide lines for coordinate / diagram precision
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    ctx.beginPath();
    for (let x = gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Realistic soft chalk dust & eraser smudge clouds
    for (let i = 0; i < 7; i++) {
        const y = height * (0.12 + i * 0.13);
        const smudgeGrad = ctx.createLinearGradient(0, y - 28, 0, y + 28);
        smudgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        smudgeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.025)');
        smudgeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = smudgeGrad;
        ctx.fillRect(20, y - 28, width - 40, 56);
    }

    // 4. Subtle chalk dust speckles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    const seed = 53;
    for (let i = 0; i < 220; i++) {
        const sx = ((Math.sin(seed + i * 19) + 1) / 2) * (width - 40) + 20;
        const sy = ((Math.cos(seed + i * 29) + 1) / 2) * (height - 40) + 20;
        const r = ((Math.sin(i * 3) + 1) / 2) * 1.5 + 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 5. Wooden chalkboard frame (inner border + beveled depth)
    const frameW = 16;
    ctx.fillStyle = '#3f2516'; // rich wood tone
    ctx.fillRect(0, 0, width, frameW);
    ctx.fillRect(0, height - frameW - 6, width, frameW + 6);
    ctx.fillRect(0, 0, frameW, height);
    ctx.fillRect(width - frameW, 0, frameW, height);

    // Inner highlight / bevel
    ctx.strokeStyle = '#5a3821';
    ctx.lineWidth = 2;
    ctx.strokeRect(frameW, frameW, width - frameW * 2, height - frameW * 2 - 6);

    // Inner shadow into the board
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(frameW + 1, frameW + 1, width - frameW * 2 - 2, height - frameW * 2 - 8);

    // Chalk tray ledge at bottom
    ctx.fillStyle = '#2f1b0e';
    ctx.fillRect(frameW, height - frameW - 6, width - frameW * 2, 4);

    // Chalk pieces resting on the bottom tray
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(frameW + 40, height - frameW - 4, 30, 4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(frameW + 80, height - frameW - 4, 25, 4);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(frameW + 115, height - frameW - 4, 28, 4);

    // 6. Header / Prompt text on the board
    if (promptText && promptText.trim()) {
        ctx.font = 'bold 15px "Chalkboard SE", "Comic Sans MS", "Caveat", cursive, sans-serif';
        ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
        ctx.shadowColor = 'rgba(254, 240, 138, 0.35)';
        ctx.shadowBlur = 2;
        ctx.fillText(`✎ ${promptText.trim()}`, frameW + 16, frameW + 24);
    }
    ctx.restore();
}

export default function DrawingCanvas({
    imageUrl,
    strokeColor = '#e11d48',
    strokeWidth = 4,
    boardTheme = 'default',
    promptText,
    onCanvasRef,
}: DrawingCanvasProps) {
    const isChalkboard = boardTheme === 'chalkboard' || !imageUrl || imageUrl.includes('__chalkboard__');
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const [activeTool, setActiveTool] = useState<Tool>('pencil');
    const [currentColor, setCurrentColor] = useState(
        isChalkboard && strokeColor === '#e11d48' ? '#f8fafc' : strokeColor
    );
    const [currentWidth, setCurrentWidth] = useState(
        isChalkboard && strokeWidth === 4 ? 3 : strokeWidth
    );
    const [history, setHistory] = useState<ImageData[]>([]);
    const [aspectRatio, setAspectRatio] = useState<number | undefined>(isChalkboard ? 1000 / 650 : undefined);
    const [scale, setScale] = useState<number>(1);
    const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const startPos = useRef<{ x: number; y: number } | null>(null);
    const isDraggingText = useRef(false);
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Load background image or render realistic chalkboard
    useEffect(() => {
        const bgCanvas = bgCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;
        if (!bgCanvas || !drawCanvas) return;

        if (isChalkboard || !imageUrl || imageUrl.includes('__chalkboard__')) {
            const width = 1000;
            const height = 650;
            bgCanvas.width = width;
            bgCanvas.height = height;
            drawCanvas.width = width;
            drawCanvas.height = height;
            setAspectRatio(width / height);
            const ctx = bgCanvas.getContext('2d')!;
            renderChalkboard(ctx, width, height, promptText);
            return;
        }

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
        img.onerror = () => {
            console.warn('Could not load base image, rendering chalkboard background');
            const width = 1000;
            const height = 650;
            bgCanvas.width = width;
            bgCanvas.height = height;
            drawCanvas.width = width;
            drawCanvas.height = height;
            setAspectRatio(width / height);
            const ctx = bgCanvas.getContext('2d')!;
            renderChalkboard(ctx, width, height, promptText);
        };
        img.src = imageUrl;
    }, [imageUrl, isChalkboard, promptText]);

    // Expose the draw canvas ref for submission
    useEffect(() => {
        onCanvasRef?.(drawCanvasRef.current);
    }, [onCanvasRef]);

    // Ensure the text input is focused when it appears
    useEffect(() => {
        if (textInput && textInputRef.current) {
            // Small timeout ensures the DOM has settled before requesting focus
            const timer = setTimeout(() => textInputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [textInput]);

    const getPosFromClient = (clientX: number, clientY: number) => {
        const canvas = drawCanvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => getPosFromClient(e.clientX, e.clientY);

    const handleTextDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault(); 
        e.currentTarget.setPointerCapture(e.pointerId);
        isDraggingText.current = true;
        const pos = getPosFromClient(e.clientX, e.clientY);
        if (textInput) {
             dragOffset.current = { x: pos.x - textInput.x, y: pos.y - textInput.y };
        }
    };

    const handleTextDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingText.current) return;
        const pos = getPosFromClient(e.clientX, e.clientY);
        setTextInput(prev => prev ? { ...prev, x: pos.x - dragOffset.current.x, y: pos.y - dragOffset.current.y } : null);
    };

    const handleTextDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        isDraggingText.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        setTimeout(() => textInputRef.current?.focus(), 50);
    };

    const saveHistory = useCallback(() => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        setHistory(prev => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (textInput) return; // Prevent interrupting active typing session

        const pos = getPos(e);
        if (activeTool === 'text') {
            e.preventDefault(); // Stop the browser from immediately stealing focus back to the canvas
            setTextInput({ x: pos.x, y: pos.y, value: '' });
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        saveHistory();
        isDrawing.current = true;
        lastPos.current = pos;
        startPos.current = pos;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current || !lastPos.current || activeTool === 'text') return;
        const canvas = drawCanvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e);

        ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : currentColor;
        ctx.lineWidth = activeTool === 'eraser' ? currentWidth * 4 : currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.shadowBlur = isChalkboard && activeTool !== 'eraser' ? 1.5 : 0;
        ctx.shadowColor = currentColor;

        if (activeTool === 'arrow' && startPos.current) {
            if (history.length > 0) {
                ctx.putImageData(history[history.length - 1], 0, 0);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            ctx.beginPath();
            ctx.moveTo(startPos.current.x, startPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();

            const angle = Math.atan2(pos.y - startPos.current.y, pos.x - startPos.current.x);
            const headLength = currentWidth * 3 + 10;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x - headLength * Math.cos(angle - Math.PI / 6), pos.y - headLength * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(pos.x - headLength * Math.cos(angle + Math.PI / 6), pos.y - headLength * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPos.current = pos;
        }
    };

    const handlePointerUp = () => {
        isDrawing.current = false;
        lastPos.current = null;
        startPos.current = null;
        const canvas = drawCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d')!;
            ctx.globalCompositeOperation = 'source-over';
        }
    };

    const handleTextSubmit = (finalValue: string, x: number, y: number) => {
        if (isDraggingText.current) return; // Prevent submission if we're mid-drag!
        
        setTextInput(null); // Clear first to prevent double-submit from blur
        
        if (!finalValue.trim()) return;
        
        saveHistory();
        const canvas = drawCanvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        // Make the handwriting font large enough for the raw image dimension
        ctx.font = `500 ${currentWidth * 6 + 32}px 'Caveat', cursive`;
        ctx.fillStyle = currentColor;
        ctx.globalCompositeOperation = 'source-over';
        ctx.textBaseline = 'top';
        ctx.fillText(finalValue, x, y);
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

    const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
    const handleZoomReset = () => setScale(1);

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
                {toolBtn('arrow', <ArrowRight size={16} />, 'Arrow')}
                {toolBtn('text', <Type size={16} />, 'Text')}
                {toolBtn('eraser', <Eraser size={16} />, 'Eraser')}

                <div className="w-px h-6 bg-slate-700" />

                {/* Chalk Palette Swatches */}
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60">
                    {CHALK_COLORS.map(c => (
                        <button
                            key={c.color}
                            title={`${c.label} chalk`}
                            onClick={() => setCurrentColor(c.color)}
                            className={`w-4 h-4 rounded-full border transition-transform ${
                                currentColor === c.color ? 'scale-125 border-white ring-2 ring-emerald-500/50' : 'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: c.color }}
                        />
                    ))}
                    <label title="Custom color" className="flex items-center ml-1 cursor-pointer">
                        <div
                            className="w-4 h-4 rounded-full border border-slate-600"
                            style={{ backgroundColor: currentColor }}
                        />
                        <input
                            type="color"
                            value={currentColor}
                            onChange={e => setCurrentColor(e.target.value)}
                            className="sr-only"
                        />
                    </label>
                </div>

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

                <button title="Zoom Out" onClick={handleZoomOut} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                    <ZoomOut size={16} />
                </button>
                <button title="Reset Zoom" onClick={handleZoomReset} className="px-1 text-xs font-medium text-slate-400 hover:text-white transition-all w-12 text-center">
                    {Math.round(scale * 100)}%
                </button>
                <button title="Zoom In" onClick={handleZoomIn} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                    <ZoomIn size={16} />
                </button>

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
                    title={isChalkboard ? "Wipe Chalkboard" : "Clear canvas"}
                    onClick={handleClear}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all"
                >
                    <Trash2 size={16} />
                </button>

                <span className="ml-auto text-xs text-slate-500 italic flex items-center gap-2">
                    {isChalkboard && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#162c20] text-emerald-300 border border-emerald-800/60 font-mono">
                            Green Board
                        </span>
                    )}
                    {activeTool === 'text' ? '⌨️ Chalk Text' : activeTool === 'arrow' ? '↗️ Vector Arrow' : activeTool === 'eraser' ? '🧹 Chalk Eraser' : '✏️ Chalk'}
                </span>
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-2 min-h-0 flex"
                style={{ background: isChalkboard ? '#0c1a13' : 'repeating-conic-gradient(#1e1e2e 0% 25%, #252535 0% 50%) 0 0 / 20px 20px' }}
            >
                <div 
                    className="relative shadow-2xl rounded-xl overflow-hidden flex-shrink-0" 
                    style={{ 
                        margin: 'auto',
                        width: scale > 1 ? `${scale * 100}%` : undefined,
                        maxWidth: scale <= 1 ? '100%' : 'none', 
                        maxHeight: scale <= 1 ? '100%' : 'none',
                        aspectRatio: aspectRatio,
                        boxShadow: isChalkboard ? '0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 0 15px rgba(0,0,0,0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
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
                            cursor: activeTool === 'text' ? 'text' : activeTool === 'eraser' ? 'cell' : 'crosshair',
                            touchAction: 'none',
                        }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    />

                    {/* Text Input Overlay */}
                    {textInput && (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${(textInput.x / (drawCanvasRef.current?.width || 1)) * 100}%`,
                                top: `${(textInput.y / (drawCanvasRef.current?.height || 1)) * 100}%`,
                                transform: 'translateY(-50%)',
                                zIndex: 50,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}
                        >
                            <div
                                onPointerDown={handleTextDragStart}
                                onPointerMove={handleTextDragMove}
                                onPointerUp={handleTextDragEnd}
                                onPointerCancel={handleTextDragEnd}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 cursor-grab active:cursor-grabbing flex items-center justify-center shadow w-16"
                                style={{ 
                                    touchAction: 'none',
                                    borderTopLeftRadius: '6px',
                                    borderTopRightRadius: '6px'
                                }}
                                title="Drag to move"
                            >
                                <GripHorizontal size={14} />
                            </div>
                            <input
                                ref={textInputRef}
                                type="text"
                                value={textInput.value}
                                onChange={(e) => setTextInput(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onBlur={(e) => {
                                    if (!isDraggingText.current) {
                                        handleTextSubmit(e.target.value, textInput.x, textInput.y);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleTextSubmit(e.currentTarget.value, textInput.x, textInput.y);
                                    }
                                }}
                                style={{
                                    fontSize: '24px',
                                    fontFamily: "'Caveat', cursive",
                                    color: currentColor,
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    border: '2px dashed #3b82f6',
                                    borderTop: 'none',
                                    borderTopLeftRadius: '0', 
                                    borderTopRightRadius: '0',
                                    borderBottomLeftRadius: '4px',
                                    borderBottomRightRadius: '4px',
                                    outline: 'none',
                                    padding: '4px 8px',
                                    margin: 0,
                                    minWidth: '200px',
                                }}
                                placeholder="Type..."
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
