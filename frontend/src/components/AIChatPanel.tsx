import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader, Settings, X } from 'lucide-react';
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
}

const GREETING: Message = { role: 'assistant', content: "Greetings! I am **SocratiQ**, your AI Coding Tutor. How can I assist you with your exercise today?" };

export default function AIChatPanel({ context, lessonId }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([GREETING]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [understandingLevel, setUnderstandingLevel] = useState(1); // 0=Beginner, 1=Intermediate, 2=Advanced, 3=Bloom's
    const levelNames = ["Beginner", "Intermediate", "Advanced", "Bloom's Taxonomy"];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-slate-800">
            {/* Header */}
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
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                    title="AI Settings"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative">
                {isSettingsOpen && (
                    <div className="absolute inset-0 bg-[#1e1e1e] z-10 flex flex-col p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-100">Settings</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-200">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="bg-[#252526] border border-slate-700/50 rounded-xl p-4 mb-6 relative">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Beginner */}
                                <div className={`p-4 rounded-lg cursor-pointer transition-colors ${understandingLevel === 0 ? 'bg-blue-900/30 border border-blue-500/50' : 'hover:bg-slate-800/50'}`} onClick={() => setUnderstandingLevel(0)}>
                                    <div className="flex items-center gap-2 mb-2 font-semibold text-slate-200"><span className="text-xl">🚲</span> Beginner</div>
                                    <p className="text-xs text-slate-400 leading-relaxed">For learners who are new to machine learning systems and are building foundational knowledge of concepts, tools, and basic implementations.</p>
                                </div>
                                {/* Intermediate */}
                                <div className={`p-4 rounded-lg cursor-pointer transition-colors ${understandingLevel === 1 ? 'bg-blue-900/30 border border-blue-500/50' : 'hover:bg-slate-800/50'}`} onClick={() => setUnderstandingLevel(1)}>
                                    <div className="flex items-center gap-2 mb-2 font-semibold text-slate-200"><span className="text-xl">🚗</span> Intermediate</div>
                                    <p className="text-xs text-slate-400 leading-relaxed">For learners who have a working understanding of machine learning principles and are ready to design and optimize systems for real-world applications.</p>
                                </div>
                                {/* Advanced */}
                                <div className={`p-4 rounded-lg cursor-pointer transition-colors ${understandingLevel === 2 ? 'bg-blue-900/30 border border-blue-500/50' : 'hover:bg-slate-800/50'}`} onClick={() => setUnderstandingLevel(2)}>
                                    <div className="flex items-center gap-2 mb-2 font-semibold text-slate-200"><span className="text-xl">🚁</span> Advanced</div>
                                    <p className="text-xs text-slate-400 leading-relaxed">For learners with significant experience in machine learning systems, focused on tackling complex problems, scaling solutions, and innovating in the field.</p>
                                </div>
                                {/* Bloom's */}
                                <div className={`p-4 rounded-lg cursor-pointer transition-colors ${understandingLevel === 3 ? 'bg-blue-900/30 border border-blue-500/50' : 'hover:bg-slate-800/50'}`} onClick={() => setUnderstandingLevel(3)}>
                                    <div className="flex items-center gap-2 mb-2 font-semibold text-slate-200"><span className="text-xl">🛸</span> Bloom's Taxonomy</div>
                                    <p className="text-xs text-slate-400 leading-relaxed">Bloom's Taxonomy is an educational framework classifying cognitive skills from basic recall to complex evaluation.</p>
                                </div>
                            </div>

                            <div className="mt-8 mb-4 px-2">
                                <h3 className="text-sm font-semibold text-slate-200 mb-4">Understanding Level</h3>
                                <div className="relative">
                                    <input
                                        type="range"
                                        min="0"
                                        max="3"
                                        step="1"
                                        value={understandingLevel}
                                        onChange={(e) => setUnderstandingLevel(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-xl mt-3 px-1">
                                        <span className={understandingLevel === 0 ? "opacity-100" : "opacity-50"}>🚲</span>
                                        <span className={understandingLevel === 1 ? "opacity-100" : "opacity-50"}>🚗</span>
                                        <span className={understandingLevel === 2 ? "opacity-100" : "opacity-50"}>🚁</span>
                                        <span className={understandingLevel === 3 ? "opacity-100" : "opacity-50"}>🛸</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(!isSettingsOpen) && messages.map((msg, idx) => (
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
                                            // Styling markdown elements
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
                {(!isSettingsOpen && isLoading) && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                            <Bot size={16} className="text-blue-400" />
                        </div>
                        <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700 flex items-center">
                            <Loader size={16} className="animate-spin text-slate-400" />
                        </div>
                    </div>
                )}
                {(!isSettingsOpen) && <div ref={messagesEndRef} />}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/30 border-t border-slate-800">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask SocratiQ a question..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-slate-600 transition-all"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
