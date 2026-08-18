import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler'
import { listLogs, subscribeLogs } from '../../lib/logger'

export function createLogsRouter() {
  const router = Router()

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const limit = Number(req.query.limit ?? 200)
      res.json({ logs: listLogs(Number.isFinite(limit) ? limit : 200) })
    }),
  )

  router.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    for (const entry of listLogs(200)) {
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
