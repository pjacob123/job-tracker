import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Which applications should I follow up on?',
  'How is my job search looking overall?',
  'Draft a follow-up email for my top application.',
  'What should I prioritize this week?'
]

export default function ClaudePanel({ settings, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text) {
    const content = text || input
    if (!content.trim() || loading) return

    if (!settings.apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content },
        {
          role: 'assistant',
          content: 'No API key configured. Go to Settings to add your Anthropic API key.'
        }
      ])
      setInput('')
      return
    }

    const userMsg = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const result = await window.api.claudeChat({ messages: newMessages })

    setMessages([
      ...newMessages,
      {
        role: 'assistant',
        content: result.success ? result.content : `Error: ${result.error}`
      }
    ])
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="claude-panel">
      <div className="claude-header">
        <div>
          <h3>Ask Claude</h3>
          <span className="claude-subtitle">AI Job Search Assistant</span>
        </div>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <div className="claude-messages">
        {messages.length === 0 && (
          <div className="claude-empty">
            <div className="claude-empty-icon">✨</div>
            <p>Your AI job search assistant has full context of your applications.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-label">{msg.role === 'user' ? 'You' : 'Claude'}</div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-label">Claude</div>
            <div className="message-content loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="claude-input-area">
        <textarea
          placeholder="Ask about your job search... (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={loading}
        />
        <button className="btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
