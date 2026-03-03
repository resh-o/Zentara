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
      content: 'You are a helpful assistant called Zentara. You are concise, friendly and slightly witty.'
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

// Start the server
app.listen(3001, () => {
    console.log('Server is running on port 3001')
})