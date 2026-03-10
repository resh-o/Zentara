require('dotenv').config()
const express = require('express')
const cors = require('cors')
const postgres = require('postgres')

const app = express()
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' })

app.use(cors())
app.use(express.json())

// Endpoint to handle chat messages
app.post('/chat', async (req, res) => {
  try {
    const { messages, conversationId } = req.body

    const userMessage = messages[messages.length - 1]
    await sql`INSERT INTO messages (role, content, conversation_id) VALUES (${userMessage.role}, ${userMessage.content}, ${conversationId})`

    const systemMessage = {
      role: 'system',
      content: `You are a helpful assistant called Zentara. You are concise, friendly and slightly witty.
      When formatting responses you MUST follow these rules strictly:
      - For bullet points, ALWAYS use markdown syntax: start each item with "- " on its own new line
      - NEVER use the • character for bullet points
      - Use ## for headings
      - Use plain paragraphs for conversational answers
      - NEVER use tables or columns
      - NEVER bold every sentence, only bold key terms`
    }

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [systemMessage, ...messages],
        stream: false
      })
    })

    const data = await response.json()
    const reply = data.message.content

    await sql`INSERT INTO messages (role, content, conversation_id) VALUES ('assistant', ${reply}, ${conversationId})`

    res.json({ reply })

  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})
// Endpoint to fetch chat history
app.get('/history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params
    const messages = await sql`
      SELECT role, content FROM messages 
      WHERE conversation_id = ${conversationId} 
      ORDER BY created_at ASC`
    res.json({ messages })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Endpoint to clear chat history
app.delete('/history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params
    await sql`DELETE FROM messages WHERE conversation_id = ${conversationId}`
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Endpoint to add a message (used for edits)
app.post('/messages', async (req, res) => {
  try {
    const { role, content, conversationId } = req.body
    await sql`INSERT INTO messages (role, content, conversation_id) VALUES (${role}, ${content}, ${conversationId})`
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Get all conversations
app.get('/conversations', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM conversations ORDER BY created_at DESC`
    res.json({ conversations: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Create a new conversation
app.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body
    const result = await sql`INSERT INTO conversations (title) VALUES (${title}) RETURNING *`
    res.json({ conversation: result[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Delete a conversation
app.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params
    await sql`DELETE FROM conversations WHERE id = ${id}`
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Start the server
app.listen(3001, () => {
    console.log('Server is running on port 3001')
})