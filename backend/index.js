const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body
    console.log('Received messages:', messages)

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: messages,
        stream: false
      })
    })

    const data = await response.json()
    console.log('Ollama response:', data)
    res.json({ reply: data.message.content })

  } catch (error) {
    console.error('Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.listen(3001, () => {
    console.log('Server is running on port 3001')
})