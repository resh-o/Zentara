import { useState, useEffect, useRef } from 'react'
import './App.css'
import logo from './logo.svg'
import ReactMarkdown from 'react-markdown'

function App() {
  // State to hold messages and current input
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  // Load all conversations on startup
  useEffect(() => {
    fetch('http://localhost:3001/conversations')
      .then(res => res.json())
      .then(data => {
        if (data.conversations.length > 0) {
          setConversations(data.conversations)
          setActiveConversation(data.conversations[0])
        }
      })
      .catch(err => console.error('Failed to load conversations:', err))
  }, [])
  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) return
    fetch(`http://localhost:3001/history/${activeConversation.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) setMessages(data.messages)
      })
      .catch(err => console.error('Failed to load messages:', err))
  }, [activeConversation])
  // Function to clear chat history and delete all messages from the database
  const clearChat = async () => {
    if (!activeConversation) return
    await fetch(`http://localhost:3001/history/${activeConversation.id}`, { method: 'DELETE' })
    setMessages([])
  }
  // Function to start editing a user message
  const startEdit = (index, content) => {
    setEditingIndex(index)
    setEditingText(content)
  }
  // Function to toggle text-to-speech
  const speak = (text) => {
    if (!ttsEnabled) return
    window.speechSynthesis.cancel()

    const cleaned = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/[-*+]\s/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/>\s/g, '')

    const utterance = new SpeechSynthesisUtterance(cleaned)
    utterance.rate = 0.95
    utterance.pitch = 1.1

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      console.log(voices.map(v => v.name)) // ← this will show you all available voices

      const femaleVoice = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Karen')    ||
        v.name.includes('Zira')     ||
        v.name.includes('Susan')    ||
        v.name.includes('Hazel')    ||
        v.name.includes('Moira')    ||
        v.name.includes('Victoria')
      )

      if (femaleVoice) {
        utterance.voice = femaleVoice
      }

      window.speechSynthesis.speak(utterance)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      setVoiceAndSpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak
    }
  }
  // Function to confirm edit and resend messages to backend
  const confirmEdit = async () => {
    const updatedMessages = messages.slice(0, editingIndex)
    setEditingIndex(null)
    setEditingText('')
    setInput(editingText)

    const userMessage = { role: 'user', content: editingText }
    const newMessages = [...updatedMessages, userMessage]
    setMessages(newMessages)
    setLoading(true)

    await fetch('http://localhost:3001/history', { method: 'DELETE' })

    for (const msg of updatedMessages) {
      await fetch('http://localhost:3001/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      })
    }

    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages })
    })

    const data = await response.json()
    const aiMessage = { role: 'assistant', content: data.reply }
    setMessages([...newMessages, aiMessage])
    speak(data.reply)
    setLoading(false)
  }
  // Function to send message to backend and get response
  const sendMessage = async () => {
    if (!input.trim() || !activeConversation) return

    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages, conversationId: activeConversation.id })
    })

    const data = await response.json()
    const aiMessage = { role: 'assistant', content: data.reply }
    setMessages([...updatedMessages, aiMessage])
    speak(data.reply)
    setLoading(false)
  }
  // Function to create a new conversation
  const createConversation = async () => {
    const res = await fetch('http://localhost:3001/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat' })
    })
    const data = await res.json()
    setConversations([data.conversation, ...conversations])
    setActiveConversation(data.conversation)
    setMessages([])
  }
  // Function to delete a conversation
  const deleteConversation = async (id) => {
    await fetch(`http://localhost:3001/conversations/${id}`, { method: 'DELETE' })
    const updated = conversations.filter(c => c.id !== id)
    setConversations(updated)
    if (activeConversation?.id === id) {
      setActiveConversation(updated[0] || null)
      setMessages([])
    }
  }
  // Function to switch conversations
  const switchConversation = (conversation) => {
    setActiveConversation(conversation)
    setMessages([])
  }
  // Render the chat interface
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="btn-new-chat" onClick={createConversation}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>
        </div>

        <div className="sidebar-conversations">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
              onClick={() => switchConversation(conv)}
            >
              <span className="conversation-title">{conv.title}</span>
              <button className="btn-delete-conv" onClick={(e) => {
                e.stopPropagation()
                deleteConversation(conv.id)
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-left">
            <button className="btn-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="brand">
              <img src={logo} alt="logo" />
              <div>
                <div className="brand-name">Zentara</div>
                <div className="brand-tag">AI Assistant</div>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className={`btn-tts ${ttsEnabled ? 'active' : ''}`} onClick={() => setTtsEnabled(!ttsEnabled)}>
              {ttsEnabled ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
              )}
            </button>
            <button className="btn-clear" onClick={clearChat}>Clear</button>
          </div>
        </div>

        <div className="messages">
          {!activeConversation ? (
            <div className="empty-state">
              <img src={logo} alt="logo" width={60} />
              <h2>Welcome to Zentara</h2>
              <p>Create a new chat to get started</p>
              <button className="btn-new-chat-main" onClick={createConversation}>New Chat</button>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <p>Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {editingIndex === index ? (
                  <div className="edit-container">
                    <input
                      className="edit-input"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                      autoFocus
                    />
                    <div className="edit-buttons">
                      <button className="btn-confirm" onClick={confirmEdit}>Save</button>
                      <button className="btn-cancel" onClick={() => setEditingIndex(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="message-content">
                    {msg.role === 'assistant' ? (
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                    {msg.role === 'user' && (
                      <button className="btn-edit" onClick={() => startEdit(index, msg.content)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="message assistant">
              <div className="thinking-dots">
                <span/><span/><span/>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={activeConversation ? "Message Zentara..." : "Create a new chat to start..."}
            disabled={!activeConversation}
          />
          <button className="btn-send" onClick={sendMessage} disabled={loading || !activeConversation}>
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
export default App;