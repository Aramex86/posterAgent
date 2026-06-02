import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const PORT = 80
const STATIC_DIR = './dist/client'

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const filePath = join(STATIC_DIR, url.pathname.slice(1))

  if (existsSync(filePath)) {
    const ext = extname(filePath)
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const content = readFileSync(filePath)

    res.statusCode = 200
    res.setHeader('Content-Type', contentType)
    res.end(content)
    return true
  }
  return false
}

const server = createServer(async (req, res) => {
  // Serve static files first
  if (req.method === 'GET' && serveStatic(req, res)) {
    return
  }

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
    res.statusCode = 500
    res.end('Internal Server Error: ' + error.message)
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
