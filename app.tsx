import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings, Plus, FileCode } from 'lucide-react';
import { LLMConfig, ChatMessage, SidebarConfig, BotGenerationConfig, DEFAULT_SIDEBAR } from './types';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { BotPreview } from './components/BotPreview';
import { callLLM, parseLLMResponse } from './utils/llmClient';
import { generateBot } from './utils/botGenerator';

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

  // Generate unique message ID
  const msgId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Handle LLM config save
  const handleSaveLlmConfig = useCallback((config: LLMConfig) => {
    setLlmConfig(config);
    setShowApiModal(false);
    // Send initial greeting if no messages yet
    if (messages.length === 0) {
      setMessages([{
        id: msgId(),
        role: 'assistant',
        content: JSON.stringify({
          action: 'message',
          message: 'Olá! 🤖 Sou o assistente de criação de bots da Ponto Bots. Vejo que você já configurou os parâmetros na sidebar à esquerda.\n\nMe conte: que tipo de estratégia de trading você gostaria de implementar no seu bot?'
        }),
        timestamp: Date.now(),
      }]);
    }
  }, [messages.length]);

  // Handle new bot creation
  const handleNewBot = useCallback(() => {
    setMessages([]);
    setBotJson(null);
    setSidebarConfig(DEFAULT_SIDEBAR);
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

  // Handle send message
  const handleSendMessage = useCallback(async (text: string) => {
    if (!llmConfig) return;

    const userMsg: ChatMessage = {
      id: msgId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await callLLM(llmConfig, [...messages, userMsg], sidebarConfig);

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

      // Create assistant message
      const assistantMsg: ChatMessage = {
        id: msgId(),
        role: 'assistant',
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // If action is generate, create the bot
      if (parsed.action === 'generate') {
        const genConfig: BotGenerationConfig = {
          botName: parsed.botName || 'Meu Bot',
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
        setActiveTab('preview');

        // Add system message about generation
        const genMsg: ChatMessage = {
          id: msgId(),
          role: 'assistant',
          content: JSON.stringify({
            action: 'message',
            message: `✅ Bot "${genConfig.botName}" gerado com sucesso!\n\nVeja o resultado na aba Preview. Você pode exportar como .ptbot ou me pedir modificações.`
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

  // Handle import
  const handleImport = useCallback((json: object) => {
    setBotJson(json);
    setActiveTab('preview');
    // Add message about import
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
          <div className="flex-1 min-h-0">
            {activeTab === 'chat' ? (
              <Chat
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                hasApiKey={!!llmConfig}
                onOpenSettings={() => setShowApiModal(true)}
              />
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
