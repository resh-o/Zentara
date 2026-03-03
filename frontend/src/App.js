import { useState } from 'react'

function App() {
  // State to hold messages and current input
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Add user message to state
    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    // Send message to backend and clear input
    setMessages(updatedMessages);
    setInput('');
    // Send message to backend and get response
    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    
    const data = await response.json();
    const aiMessage = { role: 'assistant', content: data.reply }; // Add AI response to messages
    setMessages([...updatedMessages, aiMessage]);
  }

  return (
  <div>
    <h1>AI Chat</h1>

    <div>
        {messages.map((msg, index) => (
          <p key={index}>
            <strong>{msg.role === 'user' ? 'you' : 'lamma'}:</strong> {msg.content}
          </p>
        ))}
    </div>

    <input 
      type="text" 
      value={input} 
      onChange={(e) => setInput(e.target.value)} 
      placeholder="Type a message..." 
    />

    <button onClick={sendMessage}>Send</button>
  </div>
)
}

export default App;