import type { NextFunction, Request, Response } from 'express'
import { CloseDayService } from '../services/index.js'

const closeDayService = new CloseDayService()

export async function runCloseDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined
    const from = typeof req.query.from === 'string' ? req.query.from : undefined

    const result = await closeDayService.execute(date, from)

    res.json({
      ok: true,
      job: 'close-day',
      ...result,
    })
  } catch (error) {
    next(error)
  }
}