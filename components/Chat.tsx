import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Brain } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  thinkingStep?: string;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading, thinkingStep, hasApiKey, onOpenSettings }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    onSendMessage(text);
  };

  // Filter out system messages for display
  const displayMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!hasApiKey && (
          <div className="alert alert-info text-xs">
            <Sparkles size={14} />
            <span>
              Configure sua chave de API para começar.{' '}
              <button className="link link-primary font-semibold" onClick={onOpenSettings}>
                Configurar agora →
              </button>
            </span>
          </div>
        )}

        {displayMessages.length === 0 && hasApiKey && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
            <Bot size={40} className="text-primary" />
            <div>
              <p className="text-sm font-medium text-base-content">Ponto Bots AI Builder</p>
              <p className="text-xs text-base-content/60 mt-1">
                Descreva a estratégia que deseja implementar.<br />
                A IA vai guiá-lo na criação do bot.
              </p>
            </div>
          </div>
        )}

        {displayMessages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-primary-content" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-300 text-base-content'
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-secondary-content" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
              <Bot size={14} className="text-primary-content" />
            </div>
            <div className="bg-base-300 rounded-xl px-3 py-2.5 max-w-[85%] min-w-[200px]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain size={12} className="text-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary">IA trabalhando...</span>
                <Loader2 size={11} className="animate-spin text-base-content/50 ml-auto" />
              </div>
              <div
                key={thinkingStep}
                className="text-xs text-base-content/75 leading-relaxed"
                style={{ animation: 'fadeInStep 0.4s ease-in-out' }}
              >
                {thinkingStep || '🤔 Analisando sua solicitação...'}
              </div>
              <div className="mt-2 flex gap-0.5">
                {[0,1,2,3,4,5,6,7].map(i => (
                  <div
                    key={i}
                    className="flex-1 h-0.5 rounded-full bg-primary/30"
                    style={{ animation: `loadingBar 1.6s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-base-300 p-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            className="input input-bordered input-sm flex-1 text-sm"
            placeholder={hasApiKey ? 'Descreva sua estratégia...' : 'Configure a API Key primeiro...'}
            value={input}
            disabled={!hasApiKey || isLoading}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={!input.trim() || isLoading || !hasApiKey}
            onClick={handleSend}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Parse and render message content (handles JSON action messages)
const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.message) {
      return <span className="whitespace-pre-wrap">{parsed.message}</span>;
    }
    if (parsed.action === 'generate') {
      return (
        <span className="whitespace-pre-wrap">
          ✅ Bot gerado: <strong>{parsed.botName}</strong>
          {parsed.logicNotes && <><br /><span className="text-xs opacity-70">📝 {parsed.logicNotes}</span></>}
        </span>
      );
    }
  } catch {
    // Not JSON, render as plain text
  }
  return <span className="whitespace-pre-wrap">{content}</span>;
};
