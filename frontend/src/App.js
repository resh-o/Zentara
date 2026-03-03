import { useState } from 'react'
import './App.css'
import logo from './logo.svg'

function App() {
  // State to hold messages and current input
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const clearChat = () => setMessages([])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="logo" width={40} />
          <span>Zentara</span>
        </div>
        <button className="btn-clear" onClick={clearChat}>Clear</button>
      </div>

      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <p className="thinking">Zentara is thinking...</p>}
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