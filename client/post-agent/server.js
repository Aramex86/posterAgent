import { createServer } from 'node:http'

const PORT = 80

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
  })

  try {
    const mod = await import('./dist/server/server.js')
    const handler = mod.default || mod
    console.log('Handler type:', typeof handler)
    console.log('Handler keys:', Object.keys(handler))

    const response = await handler.fetch(request)
    res.statusCode = response.status
    res.statusMessage = response.statusText
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (error) {
    console.error('Server error:', error.message)
    console.error('Stack:', error.stack)
    res.statusCode = 500
    res.end('Internal Server Error: ' + error.message)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
