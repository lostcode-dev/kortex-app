import { Router } from 'express'
import { runCloseDay } from '../controllers/index.js'
import { jobAuth } from '../middlewares/index.js'

const router = Router()

router.get('/close-day', jobAuth, runCloseDay)
router.post('/close-day', jobAuth, runCloseDay)

export default router