const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

app.post('/chat', async (req, res) => {
  const { message } = req.body

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2',
      messages: [{ role: 'user', content: message }],
      stream: false
    })
  })

  const data = await response.json()
  res.json({ reply: data.message.content })
})

app.listen(3001, () => {
    console.log('Server is running on port 3001')
})