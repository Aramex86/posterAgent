import { createServer } from 'node:http'
import handler from './dist/server/server.js'

const PORT = process.env.PORT || 80

const server = createServer(async (req, res) => {
  // Convert Node.js request to Web Request
  const url = new URL(req.url, `http://${req.headers.host}`)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? new ReadableStream({
          start(controller) {
            req.on('data', (chunk) => controller.enqueue(chunk))
            req.on('end', () => controller.close())
          },
        })
      : undefined

  const request = new Request(url, {
    method: req.method,
    headers,
    body,
  })

  try {
    const response = await handler.default.fetch(request)
    res.statusCode = response.status
    res.statusMessage = response.statusText
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    const responseBody = await response.text()
    res.end(responseBody)
  } catch (error) {
    console.error('Server error:', error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
