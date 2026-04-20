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
import adminRoutes from './routes/admin.js'
import socialRoutes from './routes/social.js'
import { logError, logRequest, serializeError } from './lib/logger.js'
import { csrfProtection } from './middleware/csrf.js'
import { initSchema } from './lib/db.js'
import axios from 'axios'

// Load env
dotenv.config()

// ─── Professional Serverless DB Boot ───
let dbInitialized = false;
const warmUpDb = async () => {
    try {
        await initSchema();
        dbInitialized = true;
        console.log('✨ Cloud Database Warm-up Successful.');
    } catch (err) {
        console.error('CRITICAL: Database Warm-up Failed:', err);
    }
};

warmUpDb();

const app: express.Application = express()

// Global Protection: Ensure we never return HTML on /api routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && !dbInitialized && req.path !== '/api/health') {
        // Allow a 10s grace period for cold-start initialization
        setTimeout(() => {
            if (dbInitialized) next();
            else res.status(503).json({ success: false, error: 'Database initializing. Please refresh.' });
        }, 2000);
        return;
    }
    next();
});

app.set('trust proxy', 1)
app.set('etag', false)
app.disable('x-powered-by')

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    const allowedOrigins = [
      process.env.APP_URL,
      process.env.VITE_APP_URL,
      'https://tip-lnk.vercel.app',
      'http://localhost:5173',
      'https://tip-lnk.vercel.app'
    ].filter(Boolean).map(url => url!.trim().replace(/\/+$/, ''));

    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      cb(null, true);
    } else {
      cb(new Error('Cross-Origin Request Blocked by TipLnk Security Guardian'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.solana.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://*", "blob:"],
      connectSrc: [
        "'self'",
        "https://*.solana.com",
        "https://*.helius-rpc.com",
        "https://api.jup.ag",
        "https://price.jup.ag",
        "https://api.eitherway.ai",
        "wss://*.solana.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}))
app.use(compression())
app.use(cors(corsOptions))

const cookieSecret = process.env.SESSION_COOKIE_SECRET;
app.use(cookieParser(cookieSecret))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(csrfProtection)

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = randomUUID()
    ; (req as any).requestId = requestId
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
app.use('/api/admin', adminRoutes) // Elite Protocol God-View
app.use('/api/social', socialRoutes) // Elite Dynamic Content Feed

/**
 * Professional RPC Proxy for Legacy Frontend Calls
 * Forwards requests to Helius instead of QuickNode.
 */
app.post('/api/quicknode/rpc/solana', async (req, res) => {
  const isDevnet = process.env.VITE_SOLANA_NETWORK === 'devnet';
  const apiKey = process.env.HELIUS_API_KEY;
  
  // ─── Professional Cluster Routing ───
  const rpcUrl = isDevnet 
    ? 'https://api.devnet.solana.com' 
    : `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  try {
    const { data } = await axios.post(rpcUrl, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(data);
  } catch (err: any) {
    console.error('RPC Proxy Fault:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json(err.response?.data || { error: 'RPC Proxy Error' });
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
