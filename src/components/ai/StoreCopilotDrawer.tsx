import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  Send,
  RotateCcw,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  Scale,
  Mail
} from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import {
  sendCopilotMessage,
  getStoredCopilotConfig,
  saveStoredCopilotConfig,
  clearStoredCopilotConfig,
  type ChatMessage,
  type CopilotConfig,
  type CopilotProvider
} from '../../services/ai/copilotService';
import { buildStoreContext } from '../../services/ai/contextBuilder';
import { useSellerData } from '../../hooks/useSellerData';
import { useInventory } from '../../hooks/useInventory';
import { useSkuCosts } from '../../hooks/useSkuCosts';
import { useFilters } from '../../hooks/useFilters';
import { Button } from '../ui/Button';

interface StoreCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const QUICK_PROMPTS = [
  {
    icon: TrendingDown,
    label: 'Why did my profit drop this week?',
    query: 'Why did my profit drop this week? Analyze returns, marketplace fees, and COGS impact.'
  },
  {
    icon: AlertTriangle,
    label: 'Which SKUs are at immediate risk of stocking out?',
    query: 'Which SKUs are at immediate risk of stocking out? Show DOI and recommended reorder units.'
  },
  {
    icon: Scale,
    label: 'Compare my Amazon vs. Flipkart net margins.',
    query: 'Compare my Amazon vs. Flipkart net margins and return rates.'
  },
  {
    icon: Mail,
    label: 'Draft a supplier restock email for critical items.',
    query: 'Draft a formal supplier restock email with itemized PO table for critical items.'
  }
];

export const StoreCopilotDrawer: React.FC<StoreCopilotDrawerProps> = ({
  isOpen,
  onClose,
  initialQuery
}) => {
  const { orders } = useSellerData();
  const { inventory } = useInventory();
  const { skuCostsMap } = useSkuCosts();
  const { preset, platform, startDate, endDate } = useFilters();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<CopilotConfig>(getStoredCopilotConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamically build store context payload from active dashboard state
  const contextPayload = useMemo(() => {
    return buildStoreContext({
      orders,
      inventory,
      skuCostsMap,
      preset,
      platform,
      startDate,
      endDate
    });
  }, [orders, inventory, skuCostsMap, preset, platform, startDate, endDate]);

  // Handle auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || inputQuery).trim();
      if (!query || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInputQuery('');
      setIsLoading(true);

      try {
        const assistantMessage = await sendCopilotMessage(newMessages, contextPayload, config);
        setMessages([...newMessages, assistantMessage]);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error generating response';
        const errorMessage: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error:** ${errorMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          providerUsed: 'Error Handler'
        };
        setMessages([...newMessages, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputQuery, isLoading, messages, contextPayload, config]
  );

  // Handle initialQuery if passed from external trigger (e.g. Executive Summary card)
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery);
    }
  }, [isOpen, initialQuery, handleSendMessage]);

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleSaveConfig = () => {
    saveStoredCopilotConfig(config);
    setTestStatus('Configuration saved successfully!');
    setTimeout(() => {
      setTestStatus(null);
      setIsSettingsOpen(false);
    }, 1200);
  };

  const handleResetToMock = () => {
    clearStoredCopilotConfig();
    const defaultConfig: CopilotConfig = {
      provider: 'mock',
      model: 'Mock AI Engine'
    };
    setConfig(defaultConfig);
    setTestStatus('Reset to Mock AI Mode.');
    setTimeout(() => {
      setTestStatus(null);
      setIsSettingsOpen(false);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        transition: 'opacity 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Slide-over Drawer Body */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '100%',
          backgroundColor: 'var(--bg-app)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
              }}
            >
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  SellerVault Copilot
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    backgroundColor: config.provider === 'mock' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: config.provider === 'mock' ? '#34d399' : '#a5b4fc',
                    border: `1px solid ${config.provider === 'mock' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                  }}
                >
                  {config.provider === 'mock' ? 'Mock AI Active' : `BYOK: ${config.provider.toUpperCase()}`}
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Grounding {orders.length} orders & {contextPayload.snapshot.criticalSkus.length} stockout alerts
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Copilot Provider & API Key Settings"
              style={{
                background: isSettingsOpen ? 'var(--bg-secondary)' : 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.45rem',
                color: isSettingsOpen ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Settings size={17} />
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              title="Clear conversation"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.45rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Copilot"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Optional Provider Settings Panel */}
        {isSettingsOpen && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Copilot Provider & BYOK Mode
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Keys stay local in browser
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Model Provider
                </label>
                <select
                  value={config.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value as CopilotProvider;
                    let defaultModel = '';
                    if (newProvider === 'gemini') defaultModel = 'gemini-1.5-flash';
                    else if (newProvider === 'openai') defaultModel = 'gpt-4o-mini';
                    else if (newProvider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
                    else if (newProvider === 'deepseek') defaultModel = 'deepseek-chat';
                    setConfig({
                      ...config,
                      provider: newProvider,
                      model: defaultModel
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="mock">Mock AI (No Key / Offline Demo)</option>
                  <option value="gemini">Google Gemini (gemini-1.5-flash / gemini-2.0-flash)</option>
                  <option value="openai">OpenAI (GPT-4o mini / GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="deepseek">DeepSeek (deepseek-chat)</option>
                  <option value="custom">Custom Compatible Endpoint</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Model Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    config.provider === 'gemini'
                      ? 'gemini-1.5-flash'
                      : config.provider === 'anthropic'
                      ? 'claude-3-5-sonnet-20241022'
                      : config.provider === 'deepseek'
                      ? 'deepseek-chat'
                      : 'gpt-4o-mini'
                  }
                  value={config.model || ''}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {config.provider !== 'mock' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  API Key (Stored in session)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={
                      config.provider === 'gemini'
                        ? 'Enter your Gemini API key (e.g. AQ... or AIza...)'
                        : `Enter your ${config.provider.toUpperCase()} API key...`
                    }
                    value={config.apiKey || ''}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.45rem 2.2rem 0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {config.provider === 'custom' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Custom Base URL
                </label>
                <input
                  type="text"
                  placeholder="https://api.your-proxy.com/v1"
                  value={config.customBaseUrl || ''}
                  onChange={(e) => setConfig({ ...config, customBaseUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.rememberOnDevice || false}
                  onChange={(e) => setConfig({ ...config, rememberOnDevice: e.target.checked })}
                />
                Remember key on this browser
              </label>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="ghost" size="sm" onClick={handleResetToMock} style={{ fontSize: '0.75rem' }}>
                  Use Mock AI
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveConfig} style={{ fontSize: '0.75rem' }}>
                  Save Key
                </Button>
              </div>
            </div>

            {testStatus && (
              <div style={{ fontSize: '0.75rem', color: '#34d399', textAlign: 'right', fontWeight: 500 }}>
                {testStatus}
              </div>
            )}
          </div>
        )}

        {/* Quick Prompts Strip */}
        <div
          style={{
            padding: '0.65rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {QUICK_PROMPTS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p.query)}
                disabled={isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Icon size={12} style={{ color: 'var(--color-primary)' }} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Transcript Container */}
        <div
          style={{
            flex: 1,
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                margin: 'auto 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '2rem 1rem'
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}
              >
                <Sparkles size={28} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                How can I assist your store today?
              </h4>
              <p
                style={{
                  margin: '0.4rem 0 1.5rem 0',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '380px',
                  lineHeight: 1.5
                }}
              >
                I have full contextual visibility into your {orders.length} orders, Amazon & Flipkart fee structures, inventory run rates, and return reconciliations.
              </p>

              <div
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                {QUICK_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p.query)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <span>{p.label}</span>
                    <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <Sparkles size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  <span>Evaluating store metrics and formulating guidance...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Copilot about profit, stockouts, margins, or suppliers..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !inputQuery.trim()}
              style={{ padding: '0.65rem 1rem' }}
            >
              <Send size={15} />
            </Button>
          </form>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.4rem',
              fontSize: '0.68rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Responses are grounded in active period orders and catalog COGS</span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
