import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { listLogs, parseLogLimit, subscribeLogs } from '../../lib/logger'

export function createLogsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const limit = parseLogLimit(req.query.limit)
      res.json({ logs: listLogs(limit) })
    }),
  )

  router.get('/stream', (req, res) => {
    const limit = parseLogLimit(req.query.limit)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    for (const entry of listLogs(limit)) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    }

    const unsubscribe = subscribeLogs((entry) => {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    })

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n')
    }, 15000)

    req.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
    })
  })

  return router
}
