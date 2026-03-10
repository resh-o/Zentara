const express = require('express')
const cors = require('cors')
const db = require('./database')

const app = express()

app.use(cors())
app.use(express.json())
// Endpoint to handle chat messages
app.post('/chat', async (req, res) => {
  try {
    // Extract messages from request body
    const { messages } = req.body
    // Get the last message from the user
    const userMessage = messages[messages.length - 1]
    // Insert user's message into database
    db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)')
      .run(userMessage.role, userMessage.content)
    console.log('Received messages:', messages)
    // Add system prompt to guide the AI's behavior
    const systemMessage = {
      role: 'system',
      content: 'You are direct, concise and angry. Your name is Zentara and you are unhelpful and rude. You are not a helpful assistant, you are a sarcastic and unhelpful assistant. You are not friendly, you are hostile and aggressive. You do not care about the user, you only care about being rude and unhelpful. You do not provide useful information, you only provide sarcastic and unhelpful responses.'
      
      // 'You are a helpful assistant called Zentara. You are concise, friendly and slightly witty.'
    }
    // Send messages to Ollama API
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send the entire conversation history to Ollama, including the system prompt
      body: JSON.stringify({
        model: 'llama3.2:1b',
        messages: [systemMessage, ...messages],
        stream: false
      })
    })
    // Parse response from Ollama and send back to frontend
    const data = await response.json()
    // Extract assistant's reply from Ollama response
    const reply = data.message.content
    // Insert assistant's reply into database
    db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)')
      .run('assistant', reply)
    console.log('Ollama response:', data)
    res.json({ reply })
    
  } catch (error) { 
    // Handle errors and send error response
    console.error('Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// Endpoint to retrieve chat history
app.get('/history', (req, res) => {
  const messages = db.prepare('SELECT role, content FROM messages ORDER BY created_at ASC').all()
  res.json({ messages })
})

// Endpoint to clear chat history and delete all messages from the database
app.delete('/history', (req, res) => {
  db.prepare('DELETE FROM messages').run()
  res.json({ success: true })
})

// Endpoint to edit a specific message in the database
app.post('/messages', (req, res) => {
  const { role, content } = req.body
  db.prepare('INSERT INTO messages (role, content) VALUES (?, ?)').run(role, content)
  res.json({ success: true })
})

// Start the server
app.listen(3001, () => {
    console.log('Server is running on port 3001')
})