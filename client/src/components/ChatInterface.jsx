import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import api, { sendChatMessage } from '../services/api';
import {
  MonitorIcon, CircleUserRound, ArrowUpIcon,
  Paperclip, Code2, Palette, Layers, Rocket, Bot, User,
  Copy, RefreshCw, BarChart3, Check, Sparkles, Cpu, X,
  WifiOff, AlertTriangle, RotateCcw
} from "lucide-react";
import clsx from "clsx";
import { useSettings } from '../contexts/SettingsContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback((reset) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (reset) {
      textarea.style.height = `${minHeight}px`;
      return;
    }
    textarea.style.height = `${minHeight}px`;
    const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
    textarea.style.height = `${newHeight}px`;
  }, [minHeight, maxHeight]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

function QuickAction({ icon, label }) {
  return (
    <Button variant="outline" className="flex items-center gap-2 rounded-full border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-700">
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

const MessageHoverMenu = memo(function MessageHoverMenu({ message, index, onCopy, onRegenerate, onTokenBreakdown, isLastAssistant }) {
  const [copied, setCopied] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(message);
  };

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
        title="Copy text"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {message.role === 'assistant' && !message.isError && isLastAssistant && (
        <button
          onClick={() => onRegenerate?.()}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
          title="Regenerate response"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
      {message.role === 'assistant' && !message.isError && (
        <div className="relative">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            title="View token breakdown"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          {showBreakdown && (
            <div className="absolute bottom-full right-0 mb-2 w-52 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 z-50">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Token Usage</p>
              {message.inputTokens !== undefined && (
                <div className="flex justify-between text-[11px] text-slate-400 py-1">
                  <span>Input tokens</span>
                  <span className="text-slate-300">{message.inputTokens?.toLocaleString() || 0}</span>
                </div>
              )}
              {message.outputTokens !== undefined && (
                <div className="flex justify-between text-[11px] text-slate-400 py-1">
                  <span>Output tokens</span>
                  <span className="text-slate-300">{message.outputTokens?.toLocaleString() || 0}</span>
                </div>
              )}
              <div className="border-t border-white/5 mt-1 pt-2 flex justify-between text-[11px] font-medium">
                <span className="text-slate-400">Total</span>
                <span className="text-violet-400">
                  {((message.inputTokens || 0) + (message.outputTokens || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({ msg, isLastAssistant, isStreaming, renderAgentIcon, onRegenerate, onRetry }) {
  return (
    <div className={clsx("group flex gap-4 w-full", msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md", msg.role === 'user' ? "bg-violet-600" : "bg-neutral-800 border border-neutral-700")}>
        {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : renderAgentIcon()}
      </div>
      <div className={clsx("flex flex-col flex-shrink-0", msg.role === 'user' ? "items-end max-w-[85%] sm:max-w-[75%]" : "items-start max-w-[90%] sm:max-w-[85%]")}>
        {msg.file && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white rounded-lg w-max text-sm border border-white/10 mb-2">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">{msg.file}</span>
          </div>
        )}
        <div className="relative flex flex-col w-full max-w-full">
          <div className={clsx(
            "px-4 py-3 rounded-2xl shadow-md text-sm break-words flex-shrink-0 w-max max-w-full",
            msg.role === 'user' ? "bg-violet-600 text-white whitespace-pre-wrap" : "bg-slate-800 border border-slate-700 text-slate-100",
            msg.isError && "border-red-500/40 bg-red-900/40 text-red-100"
          )}>
            {msg.isError ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-200 text-sm break-words">{msg.text}</p>
                  <button
                    onClick={() => onRetry?.(msg)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              </div>
            ) : msg.role === 'user' ? (
              <span>{msg.text}</span>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none break-words text-slate-100 prose-p:leading-relaxed prose-pre:p-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {isStreaming ? msg.text + ' ▍' : msg.text}
                </ReactMarkdown>
              </div>
            )}
          </div>
          {msg.role === 'assistant' && !msg.isError && !isStreaming && (
            <div className="mt-1">
              <MessageHoverMenu
                message={msg}
                index={0}
                isLastAssistant={isLastAssistant}
                onRegenerate={() => onRegenerate?.(msg)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

export default function ChatInterface({ sessionId, socket, onRegenerate, keyStatus }) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const { activeProvider: provider, setActiveProvider: setProvider, aiAgentIcon } = useSettings();
  const endOfMessagesRef = useRef(null);
  const streamingTextRef = useRef('');
  const sendTimeoutRef = useRef(null);
  const initialLoadRef = useRef(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 48, maxHeight: 150 });

  const providerNeedsKey = useCallback((prov) => {
    if (!keyStatus) return true;
    const status = keyStatus[prov];
    if (!status) return true;
    if (status.exists) return false;
    return true;
  }, [keyStatus]);

  const needsKey = providerNeedsKey(provider);

  useEffect(() => {
    if (!sessionId) return;
    setMessages([]);
    initialLoadRef.current = true;
    let cancelled = false;
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/api/chat/sessions/${sessionId}`);
        if (!cancelled) {
          setMessages(prev => {
            if (initialLoadRef.current) {
              initialLoadRef.current = false;
              return data.messages || [];
            }
            return prev;
          });
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to load session messages", err);
      }
    };
    fetchSession();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (!socket) {
      setSocketConnected(false);
      return;
    }
    setSocketConnected(socket.connected);

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleStreamStart = () => {
      setIsStreaming(true);
      setIsSending(false);
      streamingTextRef.current = '';
    };
    const handleStreamChunk = (chunk) => {
      streamingTextRef.current += chunk;
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last._streaming) {
          next[next.length - 1] = { ...last, text: streamingTextRef.current };
        } else {
          next.push({ role: 'assistant', text: streamingTextRef.current, _streaming: true });
        }
        return next;
      });
    };
    const handleStreamEnd = () => {
      const finalText = streamingTextRef.current;
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        // Guard: if the AI returned nothing, show an error instead of a blank bubble
        if (!finalText || !finalText.trim()) {
          if (last && last._streaming) next.pop();
          next.push({
            role: 'assistant',
            text: 'The AI returned an empty response. Try rephrasing your message or using a different prompt.',
            isError: true
          });
          return next;
        }
        if (last && last._streaming) {
          next[next.length - 1] = { ...last, role: 'assistant', text: finalText, _streaming: undefined };
        } else {
          next.push({ role: 'assistant', text: finalText });
        }
        return next;
      });
      setIsStreaming(false);
      streamingTextRef.current = '';
    };
    const handleError = (errorMsg) => {
      setIsStreaming(false);
      setIsSending(false);
      streamingTextRef.current = '';
      // Remove the pending streaming message if present
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last._streaming) next.pop();
        return next;
      });
      const friendlyMsg = mapErrorToFriendly(errorMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: friendlyMsg, isError: true }]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat:stream_start', handleStreamStart);
    socket.on('chat:stream_chunk', handleStreamChunk);
    socket.on('chat:stream_end', handleStreamEnd);
    socket.on('chat:error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:stream_start', handleStreamStart);
      socket.off('chat:stream_chunk', handleStreamChunk);
      socket.off('chat:stream_end', handleStreamEnd);
      socket.off('chat:error', handleError);
    };
  }, [socket]);

  // Safety timeout: reset isSending if no response after 30s
  useEffect(() => {
    if (!isSending) {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
      return;
    }
    sendTimeoutRef.current = setTimeout(() => {
      setIsSending(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Request timed out. Please check your connection and try again.',
        isError: true
      }]);
    }, 30000);
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
    };
  }, [isSending]);

  useEffect(() => {
    const el = endOfMessagesRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: 'end' });
      });
    }
  }, [messages]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
    e.target.value = null;
  };

  const handleSendViaRest = async (text) => {
    if (!sessionId) throw new Error('No active session');
    const { message: reply } = await sendChatMessage(sessionId, provider, text);
    setMessages(prev => [...prev, { role: 'assistant', text: reply.text, inputTokens: reply.inputTokens, outputTokens: reply.outputTokens }]);
  };

  const handleSend = useCallback(async () => {
    const sanitized = sanitizeInput(message);
    if ((!sanitized && !selectedFile) || !sessionId || isStreaming || isSending) return;

    setIsSending(true);
    initialLoadRef.current = false;

    const userText = sanitized;
    setMessages(prev => [...prev, { role: 'user', text: userText, file: selectedFile?.name || null }]);
    setMessage('');
    setSelectedFile(null);
    adjustHeight(true);

    try {
      if (socket && socket.connected) {
        socket.emit('chat:send', { sessionId, provider, text: userText, fileData: null, fileName: null });
      } else {
        await handleSendViaRest(userText);
        setIsSending(false);
      }
    } catch (err) {
      setIsSending(false);
      const friendlyMsg = mapErrorToFriendly(err.message || 'Failed to send message');
      setMessages(prev => [...prev, { role: 'assistant', text: friendlyMsg, isError: true }]);
    }
  }, [message, selectedFile, sessionId, isStreaming, isSending, socket, provider, adjustHeight]);

  const handleRetry = useCallback(async (errorMsg) => {
    if (isStreaming || isSending) return;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    setMessages(prev => prev.filter(m => m !== errorMsg));
    setIsSending(true);

    try {
      if (socket && socket.connected) {
        socket.emit('chat:send', { sessionId, provider, text: lastUserMsg.text, fileData: null, fileName: null });
      } else {
        await handleSendViaRest(lastUserMsg.text);
        setIsSending(false);
      }
    } catch (err) {
      setIsSending(false);
      const friendlyMsg = mapErrorToFriendly(err.message || 'Retry failed');
      setMessages(prev => [...prev, { role: 'assistant', text: friendlyMsg, isError: true }]);
    }
  }, [messages, sessionId, isStreaming, isSending, socket, provider]);

  const handleRegenerate = useCallback(async (msg) => {
    if (socket && socket.connected) {
      socket.emit('message:regenerate', { sessionId, messageId: msg._id });
    }
    onRegenerate?.(msg);
  }, [socket, sessionId, onRegenerate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showHero = messages.length === 0 && sessionId;

  const renderAgentIcon = useCallback(() => {
    switch(aiAgentIcon) {
      case 'sparkles': return <Sparkles className="w-5 h-5 text-neutral-300" />;
      case 'cpu': return <Cpu className="w-5 h-5 text-neutral-300" />;
      default: return <Bot className="w-5 h-5 text-neutral-300" />;
    }
  }, [aiAgentIcon]);

  const canSend = (message.trim() || selectedFile) && !isStreaming && !isSending && !!sessionId;

  return (
    <div className="relative flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden">
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent"
        style={{
          backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Provider Switcher & Connection Status - Always visible */}
      <div className="flex absolute top-4 right-4 z-50 items-center gap-2">
        {!socketConnected && socket && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider">
            <WifiOff className="w-3 h-3" />
            Offline
          </div>
        )}
        {['openai', 'claude', 'gemini', 'groq', 'deepseek'].map(p => (
          <button
            key={p} onClick={() => setProvider(p)}
            className={clsx(
              "px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all",
              provider === p
                ? "bg-violet-600 text-white shadow-lg"
                : "bg-black/40 text-neutral-400 hover:bg-black/60"
            )}
          >
            {p === 'openai' ? 'GPT-4o' : p === 'claude' ? 'Claude' : p === 'gemini' ? 'Gemini' : p === 'groq' ? 'Groq' : 'DeepSeek'}
          </button>
        ))}
      </div>

      {!sessionId ? (
        <div key="no-session" className="flex-1 flex flex-col items-center justify-center gap-4">
          <Bot className="w-12 h-12 text-neutral-600" />
          <p className="text-neutral-500 text-lg">Select or create a chat session to start</p>
          <p className="text-neutral-600 text-sm">Click <span className="text-violet-400">+ New Chat</span> in the sidebar</p>
        </div>
      ) : showHero ? (
        <div key="hero" className="flex-1 w-full flex flex-col items-center justify-center">
          {needsKey && (
            <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              No API key configured for {provider}. Add one in Settings.
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white drop-shadow-sm">TokenMonitor AI</h1>
            <p className="mt-2 text-sm sm:text-base text-neutral-200">Build something amazing — just start typing below.</p>
          </div>

          <div className="flex items-center justify-center flex-wrap gap-3 mt-12 max-w-3xl">
            <QuickAction icon={<Code2 className="w-4 h-4" />} label="Generate Code" />
            <QuickAction icon={<Rocket className="w-4 h-4" />} label="Launch App" />
            <QuickAction icon={<Layers className="w-4 h-4" />} label="UI Components" />
            <QuickAction icon={<Palette className="w-4 h-4" />} label="Theme Ideas" />
            <QuickAction icon={<CircleUserRound className="w-4 h-4" />} label="User Dashboard" />
            <QuickAction icon={<MonitorIcon className="w-4 h-4" />} label="Landing Page" />
          </div>
        </div>
      ) : (
        <div key="messages" className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-8">
          <div className="space-y-8 max-w-4xl mx-auto">
            {messages.map((msg, i) => {
              const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
              return (
                <MessageBubble
                  key={i}
                  msg={msg}
                  isLastAssistant={isLastAssistant}
                  isStreaming={msg._streaming}
                  renderAgentIcon={renderAgentIcon}
                  onRegenerate={handleRegenerate}
                  onRetry={handleRetry}
                />
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>
        </div>
      )}

      {/* Input Area - Always visible */}
      <div className="w-full shrink-0 border-t border-white/10 bg-slate-900/80 backdrop-blur-md p-4 z-20 relative">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">

          {selectedFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-full w-max text-sm border border-violet-500/30">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="hover:text-white hover:bg-white/10 rounded-full p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {needsKey && sessionId && messages.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              No API key for {provider}. Requests may fail. Add keys in Settings.
            </div>
          )}

          <div className={clsx("relative rounded-xl border shadow-2xl", sessionId ? "bg-black/60 backdrop-blur-md border-neutral-700" : "bg-black/30 border-neutral-800")}>
          <Textarea
            ref={textareaRef}
            value={message}
            onKeyDown={handleKeyDown}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            placeholder={!sessionId ? "Select a session to start chatting..." : isSending ? "Waiting for response..." : "Type your request..."}
            disabled={isSending || !sessionId}
            className={cn(
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-white text-sm",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-400 min-h-[48px]",
              (isSending || !sessionId) && "opacity-50"
            )}
            style={{ overflow: "hidden" }}
          />

          <div className="flex items-center justify-between p-3 border-t border-neutral-800/50">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.txt"
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={isSending || !sessionId}
              className="text-neutral-400 hover:text-white hover:bg-neutral-800"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              {isSending && (
                <span className="text-xs text-neutral-500 animate-pulse">Sending...</span>
              )}
              <Button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  canSend ? "bg-white text-black hover:bg-neutral-200" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function extractRetryDelay(errorMsg) {
  try {
    const match = errorMsg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
    if (match) return parseFloat(match[1]);
  } catch {}
  return null;
}

function mapErrorToFriendly(errorMsg) {
  if (!errorMsg) return 'An unexpected error occurred. Please try again.';
  const raw = errorMsg.replace(/^AI Service Error:\s*/i, '');
  const lower = raw.toLowerCase();

  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('auth') || lower.includes('api key')) {
    return 'Invalid API key. Verify it in Settings, then test and re-save it.';
  }
  if (lower.includes('api_key_invalid') || lower.includes('api key not') || lower.includes('api key')) {
    return 'Invalid API key. Verify it in Settings, then test and re-save it.';
  }
  if (lower.includes('quota exceeded') || lower.includes('quota') || lower.includes('billing') || lower.includes('credit')) {
    const delay = extractRetryDelay(errorMsg);
    if (delay) {
      const secs = Math.ceil(delay);
      return `Daily free tier quota exceeded. Retry in ~${secs}s, or set up billing at https://ai.google.dev/pricing for higher limits.`;
    }
    return 'Free tier quota exceeded. Wait a bit or set up billing at https://ai.google.dev/pricing.';
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many')) {
    const delay = extractRetryDelay(errorMsg);
    if (delay) {
      const secs = Math.ceil(delay);
      return `Rate limit reached. Retry in ~${secs}s (free tier: ~10 req/min).`;
    }
    return 'Rate limit reached (free tier: ~10 req/min). Wait about 1 minute and try again.';
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout') || lower.includes('econnrefused') || lower.includes('econnreset') || lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (lower.includes('500') || lower.includes('internal') || lower.includes('service error')) {
    return 'The AI service encountered an error. Please try again in a moment.';
  }
  if (lower.includes('400') || lower.includes('bad request')) {
    return 'Request failed. Your API key may be invalid — check it in Settings.';
  }
  return `Error: ${raw.length > 150 ? raw.slice(0, 150) + '...' : raw}`;
}
