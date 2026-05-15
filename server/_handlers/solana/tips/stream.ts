import { Redis } from '@upstash/redis';

export const config = {
  runtime: 'edge',
};

/**
 * PHASE 3: REAL-TIME SYSTEM (Live Tip Feed)
 * Edge function establishing a Server-Sent Events (SSE) stream.
 * Subscribes to Redis 'live-tips' channel and pushes updates instantly.
 */
export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const walletAddress = url.searchParams.get('wallet');

  if (!walletAddress) {
    return new Response('Wallet address required', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('retry: 10000\n\n'));
      
      let interval: any;
      try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        
        if (!redisUrl || !redisToken) {
             throw new Error('Redis configuration missing');
        }

        const redis = new Redis({
            url: redisUrl,
            token: redisToken,
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'connected', wallet: walletAddress })}\n\n`));
        
        interval = setInterval(async () => {
          try {
             // Polling for live events since REST doesn't support Pub/Sub
             const event = await redis.rpop(`live_tips:${walletAddress}`);
             if (event) {
                 controller.enqueue(encoder.encode(`data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`));
             } else {
                 controller.enqueue(encoder.encode(':\n\n')); // Keep-alive
             }
          } catch (e) {
             clearInterval(interval);
             (stream as any)._interval = null;
          }
        }, 5000);
        
        // Attach interval to stream for cancellation
        (stream as any)._interval = interval;

      } catch (err: any) {
        console.error('SSE Stream Error:', err);
        controller.error(err);
      }
    },
    cancel() {
      console.log('Stream canceled by client');
      if ((stream as any)._interval) {
        clearInterval((stream as any)._interval);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
