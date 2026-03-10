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
    const { messages } = req.body
    const userMessage = messages[messages.length - 1]

    await sql`INSERT INTO messages (role, content) VALUES (${userMessage.role}, ${userMessage.content})`

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

    await sql`INSERT INTO messages (role, content) VALUES ('assistant', ${reply})`

    res.json({ reply })

  } catch (err) {
    console.error('Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})
// Endpoint to fetch chat history
app.get('/history', async (req, res) => {
  try {
    const messages = await sql`SELECT role, content FROM messages ORDER BY created_at ASC`
    res.json({ messages })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Endpoint to clear chat history
app.delete('/history', async (req, res) => {
  try {
    await sql`DELETE FROM messages`
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Endpoint to add a message (used for edits)
app.post('/messages', async (req, res) => {
  try {
    const { role, content } = req.body
    await sql`INSERT INTO messages (role, content) VALUES (${role}, ${content})`
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Start the server
app.listen(3001, () => {
    console.log('Server is running on port 3001')
})