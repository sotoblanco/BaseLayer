import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2, Undo2, ZoomIn, ZoomOut, ArrowRight, Type, GripHorizontal } from 'lucide-react';

interface DrawingCanvasProps {
    imageUrl: string;
    strokeColor?: string;
    strokeWidth?: number;
    onCanvasRef?: (ref: HTMLCanvasElement | null) => void;
}

type Tool = 'pencil' | 'eraser' | 'arrow' | 'text';

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
    const [scale, setScale] = useState<number>(1);
    const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const startPos = useRef<{ x: number; y: number } | null>(null);
    const isDraggingText = useRef(false);
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
                    title="Clear canvas"
                    onClick={handleClear}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all"
                >
                    <Trash2 size={16} />
                </button>

                <span className="ml-auto text-xs text-slate-500 italic">
                    {activeTool === 'text' ? '⌨️ Text' : activeTool === 'arrow' ? '↗️ Arrow' : activeTool === 'eraser' ? '🧹 Erasing' : '✏️ Drawing'}
                </span>
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-2 min-h-0 flex"
                style={{ background: 'repeating-conic-gradient(#1e1e2e 0% 25%, #252535 0% 50%) 0 0 / 20px 20px' }}
            >
                <div 
                    className="relative shadow-2xl shadow-black/50 rounded-lg overflow-hidden flex-shrink-0 bg-white" 
                    style={{ 
                        margin: 'auto',
                        width: scale > 1 ? `${scale * 100}%` : undefined,
                        maxWidth: scale <= 1 ? '100%' : 'none', 
                        maxHeight: scale <= 1 ? '100%' : 'none',
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
