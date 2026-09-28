import React, { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../../services/ai/copilotService';

interface ChatBubbleProps {
  message: ChatMessage;
}

/**
 * Lightweight formatting helper converting basic Markdown (tables, code blocks, bold, lists)
 * into semantic HTML without external heavy dependencies.
 */
function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return null;
    const header = tableRows[0];
    const body = tableRows.slice(2); // skip header separator line (|---|---|)

    const renderedTable = (
      <div key={`table_${key}`} style={{ overflowX: 'auto', margin: '0.75rem 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            textAlign: 'left'
          }}
        >
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              {header.map((col, idx) => (
                <th key={idx} style={{ padding: '0.45rem 0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {col.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rIdx) => (
              <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: '0.4rem 0.65rem', color: 'var(--text-secondary)' }}>
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
    return renderedTable;
  };

  const flushCodeBlock = (key: number) => {
    const code = codeBlockLines.join('\n');
    codeBlockLines = [];
    inCodeBlock = false;
    return (
      <pre
        key={`code_${key}`}
        style={{
          background: 'var(--bg-app)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.75rem',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          overflowX: 'auto',
          margin: '0.5rem 0',
          color: '#e0e7ff',
          whiteSpace: 'pre'
        }}
      >
        <code>{code}</code>
      </pre>
    );
  };

  const formatInline = (text: string): React.ReactNode => {
    // Split on inline code `...` and bold **...**
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Inline code
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Bold
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      if (!codeMatch && !boldMatch) {
        parts.push(remaining);
        break;
      }

      const codeIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity;
      const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;

      if (codeIndex < boldIndex && codeMatch) {
        if (codeIndex > 0) {
          parts.push(remaining.substring(0, codeIndex));
        }
        parts.push(
          <code
            key={`c_${keyIdx++}`}
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#c7d2fe',
              padding: '0.15rem 0.35rem',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'monospace'
            }}
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.substring(codeIndex + codeMatch[0].length);
      } else if (boldMatch) {
        if (boldIndex > 0) {
          parts.push(remaining.substring(0, boldIndex));
        }
        parts.push(
          <strong key={`b_${keyIdx++}`} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.substring(boldIndex + boldMatch[0].length);
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(flushCodeBlock(i));
      } else {
        if (inTable) elements.push(flushTable(i));
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Table rows (| ... |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line.split('|').slice(1, -1);
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      elements.push(flushTable(i));
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4_${i}`}
          style={{
            margin: '0.75rem 0 0.35rem 0',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}
        >
          {formatInline(line.substring(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={`h3_${i}`}
          style={{
            margin: '0.85rem 0 0.4rem 0',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}
        >
          {formatInline(line.substring(3))}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq_${i}`}
          style={{
            margin: '0.5rem 0',
            padding: '0.4rem 0.75rem',
            borderLeft: '3px solid var(--color-primary)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            borderRadius: '0 6px 6px 0'
          }}
        >
          {formatInline(line.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered List Items
    if (line.trim().startsWith('- ')) {
      elements.push(
        <div
          key={`li_${i}`}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.45rem',
            margin: '0.2rem 0',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}
        >
          <span style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>•</span>
          <div>{formatInline(line.trim().substring(2))}</div>
        </div>
      );
      continue;
    }

    // Ordered List Items (1. , 2. etc)
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div
          key={`oli_${i}`}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.45rem',
            margin: '0.25rem 0',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}
        >
          <span style={{ color: 'var(--color-primary)', fontWeight: 600, minWidth: '16px' }}>
            {numMatch[1]}.
          </span>
          <div>{formatInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`sp_${i}`} style={{ height: '0.35rem' }} />);
      continue;
    }

    // Standard Paragraph Line
    elements.push(
      <p
        key={`p_${i}`}
        style={{
          margin: '0.25rem 0',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55
        }}
      >
        {formatInline(line)}
      </p>
    );
  }

  if (inTable) elements.push(flushTable(lines.length));
  if (inCodeBlock) elements.push(flushCodeBlock(lines.length));

  return elements;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '16px 16px 4px 16px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              wordBreak: 'break-word'
            }}
          >
            {message.content}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingRight: '0.25rem' }}>
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
      <div
        style={{
          maxWidth: '92%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
        <div
          style={{
            width: '100%',
            padding: '1rem 1.15rem',
            borderRadius: '16px 16px 16px 4px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.5rem',
              marginBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={15} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                SellerVault Copilot
              </span>
              {message.providerUsed && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#c7d2fe',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                >
                  {message.providerUsed}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              title="Copy message to clipboard"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: copied ? '#34d399' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                padding: '0.2rem 0.4rem',
                borderRadius: '4px'
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Formatted Content */}
          <div style={{ lineHeight: 1.55 }}>
            {renderMarkdown(message.content)}
          </div>
        </div>

        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>
          {message.timestamp}
        </span>
      </div>
    </div>
  );
};
