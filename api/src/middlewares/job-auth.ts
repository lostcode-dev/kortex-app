import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/index.js'

export function jobAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.JOB_TRIGGER_TOKEN) {
    res.status(503).json({ error: 'JOB_TRIGGER_TOKEN não configurado no servidor' })
    return
  }

  const authHeader = req.headers.authorization
  const expected = `Bearer ${env.JOB_TRIGGER_TOKEN}`

  if (authHeader !== expected) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}