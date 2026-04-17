import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import solanaRoutes from './routes/solana.js'
import deepLinkRoutes from './routes/deep-link.js'
import { logError, logRequest, serializeError } from './lib/logger.js'
import { csrfProtection } from './middleware/csrf.js'
import { initSchema } from './lib/db.js'

// Load env
dotenv.config()

// ─── Professional Serverless DB Boot ───
// Ensures Supabase schema is synced on cold-start
initSchema().catch(err => console.error('Serverless DB Init Failed:', err));

const app: express.Application = express()

app.set('trust proxy', 1)
app.set('etag', false)
app.disable('x-powered-by')

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // In dev, allow all. In prod, we should restrict.
    cb(null, true)
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // UI is separate
}))
app.use(compression())
app.use(cors(corsOptions))

const cookieSecret = process.env.SESSION_COOKIE_SECRET 
app.use(cookieParser(cookieSecret))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(csrfProtection)

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = randomUUID()
  ;(req as any).requestId = requestId
  _res.setHeader('x-request-id', requestId)

  const startedAt = Date.now()
  _res.on('finish', () => {
    logRequest({
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: _res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
    })
  })
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/solana', solanaRoutes)
app.use('/api/supabase', solanaRoutes) // Alias for frontend compatibility
app.use('/api/deep-link', deepLinkRoutes) // Handle-to-wallet resolution

/**
 * Professional RPC Proxy for Legacy Frontend Calls
 * Forwards requests to Helius instead of QuickNode.
 */
app.post('/api/quicknode/rpc/solana', async (req, res) => {
  try {
    const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY }`;
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'RPC Proxy Error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = (error as any)?.status || 500
  const requestId = (req as any).requestId
  logError('api_error', {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    error: serializeError(error),
  })
  res.status(status).json({
    success: false,
    code: 'API_ERROR',
    requestId,
    error: 'Server internal error',
  })
})

export default app
