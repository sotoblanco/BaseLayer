import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { discussImplementation } from '../services/aiService';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatPanelProps {
    context: string;
    lessonId: string;
    variant?: 'standalone' | 'integrated';
}

const GREETING: Message = { role: 'assistant', content: "Greetings! I am **SocratiQ**, your AI Coding Tutor. How can I assist you with your exercise today?" };

export default function AIChatPanel({ context, lessonId, variant = 'standalone' }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([GREETING]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [understandingLevel, setUnderstandingLevel] = useState(1); // 0=Beginner, 1=Intermediate, 2=Advanced, 3=Bloom's
    const levelNames = ["Beginner", "Intermediate", "Advanced", "Bloom's Taxonomy"];

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        } else if (variant === 'integrated') {
            // For integrated mode, we might need to tell the parent to scroll
            // We'll handle this via a small delay to allow DOM to update
            const parent = document.getElementById('instruction-scroll-container');
            if (parent) {
                parent.scrollTop = parent.scrollHeight;
            }
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Reset conversation when the lesson changes
    useEffect(() => {
        setMessages([GREETING]);
        setInput('');
        setIsSettingsOpen(false);
    }, [lessonId]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await discussImplementation(userMessage, context, levelNames[understandingLevel]);
            setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessages = () => (
        <div className={`p-4 space-y-6 ${variant === 'standalone' ? 'flex-1 overflow-y-auto custom-scrollbar' : ''}`} ref={variant === 'standalone' ? scrollContainerRef : null}>
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600/20 border border-blue-500/30'}`}>
                        {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} className="text-blue-400" />}
                    </div>

                    <div className={`rounded-xl px-4 py-3 text-sm max-w-[85%] shadow-sm ${msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#252526] text-slate-200 border border-slate-700/50'
                        }`}>
                        {msg.role === 'user' ? (
                            <p>{msg.content}</p>
                        ) : (
                            <div className="markdown-prose space-y-3">
                                <ReactMarkdown
                                    children={msg.content}
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                        code({ node, inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            return !inline && match ? (
                                                <div className="rounded-lg overflow-hidden my-2 border border-slate-700">
                                                    <div className="bg-slate-900/50 px-3 py-1 text-xs text-slate-400 border-b border-slate-700 font-mono">
                                                        {match[1]}
                                                    </div>
                                                    <div className="bg-[#1e1e1e] p-3 overflow-x-auto">
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    </div>
                                                </div>
                                            ) : (
                                                <code className="bg-slate-800/80 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs border border-slate-700/50" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        },
                                        p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
                                        h1: ({ children }) => <h1 className="text-lg font-bold text-slate-100">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-base font-semibold text-slate-100">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-100">{children}</h3>,
                                        blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500 pl-3 italic text-slate-400">{children}</blockquote>,
                                        a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-blue-400" />
                    </div>
                    <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700 flex items-center">
                        <Loader size={16} className="animate-spin text-slate-400" />
                    </div>
                </div>
            )}
        </div>
    );

    const renderInput = () => (
        <div className={`p-4 bg-slate-900/30 border-t border-slate-800 ${variant === 'integrated' ? 'sticky bottom-0 z-20 backdrop-blur-md pb-6' : ''}`}>
            <div className="relative max-w-4xl mx-auto">
                {/* Level selector popover */}
                {isSettingsOpen && (
                    <div className="absolute bottom-full left-0 mb-3 w-72 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden z-30 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tutoring Style</span>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-2 space-y-1">
                            {levelNames.map((name, idx) => (
                                <button
                                    key={name}
                                    onClick={() => {
                                        setUnderstandingLevel(idx);
                                        setIsSettingsOpen(false);
                                    }}
                                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${
                                        understandingLevel === idx 
                                            ? 'bg-blue-600/20 border border-blue-500/30 ring-1 ring-blue-500/20' 
                                            : 'hover:bg-slate-800 border border-transparent'
                                    }`}
                                >
                                    <span className="text-xl shrink-0">{['🚲', '🚗', '🚁', '🛸'][idx]}</span>
                                    <div>
                                        <div className={`text-xs font-bold ${understandingLevel === idx ? 'text-blue-400' : 'text-slate-200'}`}>{name}</div>
                                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                            {[
                                                "Foundational concepts & tools.",
                                                "Design & optimization principles.",
                                                "Complex problems & innovation.",
                                                "Higher-order cognitive evaluation."
                                            ][idx]}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-2xl relative">
                    {/* Level Emoji Trigger */}
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="flex items-center justify-center w-12 h-12 text-xl hover:bg-slate-900/50 transition-colors border-r border-slate-800/50 rounded-l-xl"
                        title="Change Tutoring Level"
                    >
                        {['🚲', '🚗', '🚁', '🛸'][understandingLevel]}
                    </button>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask SocratiQ a question..."
                        className="flex-1 bg-transparent py-3 px-4 text-sm text-slate-300 focus:outline-none placeholder:text-slate-600"
                        disabled={isLoading}
                    />
                    
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="p-3 text-slate-400 hover:text-blue-400 disabled:opacity-50 transition-colors mr-1"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col ${variant === 'standalone' ? 'h-full bg-[#1e1e1e] border-t border-slate-800' : 'bg-transparent'}`}>
            {/* Header - Only for standalone */}
            {variant === 'standalone' && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center border border-blue-400 shadow shadow-blue-500/20">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-200">SocratiQ</h3>
                                <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm bg-blue-900/50 text-blue-300 border border-blue-500/20">
                                    {levelNames[understandingLevel]}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">AI Coding Tutor</p>
                        </div>
                    </div>
                    {/* No settings icon here anymore, it's in the input bar */}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative">
                {renderMessages()}
                {renderInput()}
            </div>
        </div>
    );
}


