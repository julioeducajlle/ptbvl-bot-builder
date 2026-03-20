import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings, Plus, FileCode } from 'lucide-react';
import { LLMConfig, ChatMessage, SidebarConfig, BotGenerationConfig, DEFAULT_SIDEBAR } from './types';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { BotPreview } from './components/BotPreview';
import { BotSuggestions } from './components/BotSuggestions';
import { callLLM, parseLLMResponse } from './utils/llmClient';
import { generateBot } from './utils/botGenerator';
import { loadBotLibrary, searchBots, loadBotFile, BotMetadata, BotMatch } from './utils/botLibrary';

type Tab = 'chat' | 'preview';

const App: React.FC = () => {
  // State
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [sidebarConfig, setSidebarConfig] = useState<SidebarConfig>(DEFAULT_SIDEBAR);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [botJson, setBotJson] = useState<object | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Bot Library state
  const [botLibrary, setBotLibrary] = useState<BotMetadata[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<BotMatch[]>([]);
  const [suggestionTermCount, setSuggestionTermCount] = useState(0);

  // Load bot library on mount
  useEffect(() => {
    loadBotLibrary().then(lib => {
      setBotLibrary(lib);
      if (lib.length > 0) {
        console.log(`Bot library loaded: ${lib.length} bots`);
      }
    });
  }, []);

  // Generate unique message ID
  const msgId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Handle LLM config save
  const handleSaveLlmConfig = useCallback((config: LLMConfig) => {
    setLlmConfig(config);
    setShowApiModal(false);
    if (messages.length === 0) {
      const libraryInfo = botLibrary.length > 0
        ? `\n\nℹ️ Biblioteca carregada com **${botLibrary.length} bots**. Quando descrever uma estratégia, verifico se já existe algo similar!`
        : '';
      setMessages([{
        id: msgId(),
        role: 'assistant',
        content: JSON.stringify({
          action: 'message',
          message: `Olá! 🤖 Sou o assistente de criação de bots da Ponto Bots. Vejo que você já configurou os parâmetros na sidebar à esquerda.\n\nMe conte: que tipo de estratégia de trading você gostaria de implementar no seu bot?${libraryInfo}`
        }),
        timestamp: Date.now(),
      }]);
    }
  }, [messages.length, botLibrary.length]);

  // Handle new bot creation
  const handleNewBot = useCallback(() => {
    setMessages([]);
    setBotJson(null);
    setSidebarConfig(DEFAULT_SIDEBAR);
    setSuggestions([]);
    setPendingQuery(null);
    if (llmConfig) {
      setMessages([{
        id: msgId(),
        role: 'assistant',
        content: JSON.stringify({
          action: 'message',
          message: 'Novo bot! 🆕 As configurações foram resetadas. Me diga: que tipo de estratégia deseja para este bot?'
        }),
        timestamp: Date.now(),
      }]);
    }
    setActiveTab('chat');
  }, [llmConfig]);

  // Core function that actually calls the LLM
  const processWithLLM = useCallback(async (text: string, extraContext?: string) => {
    if (!llmConfig) return;
    setIsLoading(true);
    setSuggestions([]);
    setPendingQuery(null);

    const userMsg: ChatMessage = {
      id: msgId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => {
      // Avoid duplicate if already added
      if (prev.some(m => m.content === text && m.role === 'user')) return prev;
      return [...prev, userMsg];
    });

    // Build messages with optional extra context injected as system message
    const allMessages = [...messages, userMsg];
    if (extraContext) {
      allMessages.push({
        id: msgId(),
        role: 'system',
        content: extraContext,
        timestamp: Date.now(),
      });
    }

    try {
      const result = await callLLM(llmConfig, allMessages, sidebarConfig);

      if (!result.success) {
        const errorMsg: ChatMessage = {
          id: msgId(),
          role: 'assistant',
          content: JSON.stringify({
            action: 'message',
            message: `⚠️ Erro ao chamar a IA: ${result.error}\n\nVerifique sua chave de API nas configurações.`
          }),
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      const content = result.content || '';
      const parsed = parseLLMResponse(content);

      const assistantMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (parsed.action === 'generate') {
        const botName = parsed.botName || 'Meu Bot';

        // Use botJson from LLM directly if provided (preferred)
        if (parsed.botJson && typeof parsed.botJson === 'object') {
          setBotJson(parsed.botJson);
        } else {
          // Fallback: use botGenerator
          const genConfig: BotGenerationConfig = {
            botName,
            contractType: parsed.contractType || sidebarConfig.contractType,
            direction: parsed.direction || 'CALL',
            digitValue: parsed.digitValue ?? undefined,
            triggerType: parsed.triggerType || 'always',
            triggerPattern: parsed.triggerPattern || undefined,
            triggerDirection: parsed.triggerDirection || undefined,
            logicNotes: parsed.logicNotes || '',
            sidebar: sidebarConfig,
          };
          const bot = generateBot(genConfig);
          setBotJson(bot);
        }

        setActiveTab('preview');

        const successMsg = parsed.message || `✅ Bot "${botName}" gerado com sucesso!\n\nVeja o resultado na aba Preview. Você pode exportar como .ptbot ou me pedir modificações.`;
        const genMsg: ChatMessage = {
          id: msgId(),
          role: 'assistant',
          content: JSON.stringify({
            action: 'message',
            message: successMsg,
          }),
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, genMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        content: JSON.stringify({
          action: 'message',
          message: `❌ Erro inesperado: ${String(err)}`
        }),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [llmConfig, messages, sidebarConfig]);

  // Handle send message — check library first if library is loaded
  const handleSendMessage = useCallback(async (text: string) => {
    if (!llmConfig) return;

    // Add user message to chat immediately
    const userMsg: ChatMessage = {
      id: msgId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Check library for matches (only on first or standalone message)
    if (botLibrary.length > 0) {
      const terms = text.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
      const matches = searchBots(text, botLibrary, 3);

      if (matches.length > 0) {
        // Show suggestions and pause — don't call LLM yet
        setSuggestions(matches);
        setSuggestionTermCount(terms.length);
        setPendingQuery(text);
        setIsLoading(false);
        return;
      }
    }

    // No matches — proceed directly to LLM
    await processWithLLM(text);
  }, [llmConfig, botLibrary, processWithLLM]);

  // User chose to use an existing bot directly
  const handleUseSuggestedBot = useCallback(async (match: BotMatch) => {
    setSuggestions([]);
    setPendingQuery(null);
    setIsLoading(true);

    try {
      const botData = await loadBotFile(match.filename);
      setBotJson(botData);
      setActiveTab('preview');

      const msg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        content: JSON.stringify({
          action: 'message',
          message: `✅ Bot **"${match.name}"** carregado da biblioteca!\n\nVeja na aba Preview. Me diga se quer fazer alguma modificação.`
        }),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      const msg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        content: JSON.stringify({
          action: 'message',
          message: `⚠️ Não foi possível carregar o bot: ${String(err)}`
        }),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // User chose to use a bot as a base/template
  const handleUseAsBase = useCallback(async (match: BotMatch) => {
    setSuggestions([]);
    const query = pendingQuery || '';
    setPendingQuery(null);

    const extraContext = `O usuário quer um bot baseado em "${match.name}" (${match.contractTypes.join(', ')}). Use esta estratégia como base e adapte conforme o pedido do usuário. Bot de referência: ${match.filename}`;

    await processWithLLM(query, extraContext);
  }, [pendingQuery, processWithLLM]);

  // User chose to ignore suggestions and create from scratch
  const handleCreateNew = useCallback(async () => {
    const query = pendingQuery || '';
    setSuggestions([]);
    setPendingQuery(null);

    await processWithLLM(query);
  }, [pendingQuery, processWithLLM]);

  // Handle import
  const handleImport = useCallback((json: object) => {
    setBotJson(json);
    setActiveTab('preview');
    const importMsg: ChatMessage = {
      id: msgId(),
      role: 'assistant',
      content: JSON.stringify({
        action: 'message',
        message: '📂 Bot importado com sucesso! Veja a validação na aba Preview.\n\nMe diga o que gostaria de modificar neste bot.'
      }),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, importMsg]);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-base-100 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-base-200 border-b border-base-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-primary">🤖 PB</span>
          <button className="btn btn-ghost btn-xs gap-1" onClick={handleNewBot}>
            <Plus size={12} /> Novo Bot
          </button>
          {botLibrary.length > 0 && (
            <span className="badge badge-xs badge-ghost" title="Bots na biblioteca">
              📚 {botLibrary.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {llmConfig && (
            <span className="badge badge-xs badge-primary">{llmConfig.provider}/{llmConfig.model}</span>
          )}
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setShowApiModal(true)}
            title="Configurar API"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          config={sidebarConfig}
          onChange={setSidebarConfig}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main area with tabs */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex border-b border-base-300 shrink-0">
            <button
              className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-base-content/50 hover:text-base-content/70'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </button>
            <button
              className={`px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === 'preview'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-base-content/50 hover:text-base-content/70'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              <FileCode size={12} /> Preview
              {botJson && <span className="badge badge-xs badge-success">1</span>}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTab === 'chat' ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Chat
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    hasApiKey={!!llmConfig}
                    onOpenSettings={() => setShowApiModal(true)}
                  />
                </div>
                {/* Suggestions panel — shown above input area when there are matches */}
                {suggestions.length > 0 && (
                  <div className="shrink-0 border-t border-base-300 p-2 bg-base-50 overflow-y-auto max-h-80">
                    <BotSuggestions
                      matches={suggestions}
                      queryTermCount={suggestionTermCount}
                      onUseBot={handleUseSuggestedBot}
                      onUseAsBase={handleUseAsBase}
                      onCreateNew={handleCreateNew}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </div>
            ) : (
              <BotPreview
                botJson={botJson}
                onImport={handleImport}
                onClear={() => setBotJson(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        llmConfig={llmConfig}
        onSave={handleSaveLlmConfig}
        onClose={() => setShowApiModal(false)}
        isOpen={showApiModal}
      />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
