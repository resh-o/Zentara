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

  // Function to clear chat history and delete all messages from the database
  const clearChat = async () => {
    await fetch('http://localhost:3001/history', { method: 'DELETE' })
    setMessages([])
  }

  const startEdit = (index, content) => {
    setEditingIndex(index)
    setEditingText(content)
  }

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
    setLoading(false)
  }


  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch chat history from backend on component mount
  useEffect(() => {
    fetch('http://localhost:3001/history')
      .then(res => res.json())
      .then(data => {
        if (data.messages) setMessages(data.messages)
      })
      .catch(err => console.error('History fetch failed:', err))
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return
    // Add user message to state
    const userMessage = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    // Send message to backend and clear input
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    // Send message to backend and get response
    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages })
    })
    
    const data = await response.json()
    const aiMessage = { role: 'assistant', content: data.reply } // Add AI response to messages
    setMessages([...updatedMessages, aiMessage])
    setLoading(false)
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="brand">
          <img src={logo} alt="logo" />
          <div>
            <div className="brand-name">Zentara</div>
            <div className="brand-tag">AI Assistant</div>
          </div>
        </div>
        <button className="btn-clear" onClick={clearChat}>Clear</button>
      </div>

      <div className="messages">
        {messages.map((msg, index) => (
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
                  <button className="btn-edit" onClick={() => startEdit(index, msg.content)}>✏️</button>
                )}
              </div>
            )}
          </div>
        ))}

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
          placeholder="Message Zentara..."
        />
        <button className="btn-send" onClick={sendMessage} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export default App;