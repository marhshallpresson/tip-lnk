import axios from 'axios';
import { logError } from './logger.js';

// Define the Torque Event Schema
export interface TorqueEvent {
  event_type: 
    | 'user_signup' 
    | 'user_login'
    | 'wallet_linked'
    | 'embed_loaded' 
    | 'tip_initiated' 
    | 'tip_completed' 
    | 'creator_first_tip';
  
  timestamp: string;
  
  metadata: {
    user_id?: string;
    dynamic_user_id?: string;
    wallet_address?: string;
    creator_id?: string;
    amount_usd?: number;
    token_symbol?: string;
    tx_signature?: string;
    source?: 'frontend' | 'backend' | 'helius_webhook';
    origin_domain?: string;
    referral_code?: string;
    [key: string]: any;
  };
}

const TORQUE_API_URL = process.env.TORQUE_API_URL || 'http://localhost:3000/api/events'; // Mock or actual Torque MCP endpoint
const TORQUE_API_KEY = process.env.TORQUE_API_KEY;

/**
 * PHASE 2 & 7: TORQUE EVENT PIPELINE
 * Emits validated events to the Torque growth tracking system.
 */
export const emitTorqueEvent = async (event: Omit<TorqueEvent, 'timestamp'>) => {
  const fullEvent: TorqueEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // In development without a key, just log
  if (!TORQUE_API_KEY) {
    console.log(`[Torque Local] Emitted event: ${event.event_type}`, fullEvent.metadata);
    return;
  }

  try {
    // ─── ELITE DEAD LETTER QUEUE (DLQ) PREPARATION ───
    // If Redis was fully set up here, we would push to a stream first.
    // For now, we attempt direct delivery.
    
    await axios.post(TORQUE_API_URL, fullEvent, {
      headers: {
        'Authorization': `Bearer ${TORQUE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000, // Fail fast so we don't block main threads
    });
    
  } catch (error: any) {
    // ─── PHASE 9: FAILURE HANDLING ───
    // Do NOT throw. Logging failure is sufficient to prevent blocking core flows like Webhooks.
    console.error(`[Torque Error] Failed to emit ${event.event_type}:`, error.message);
    logError('torque_emit_failed', { event, error: error.message });
    
    // TODO: Push to Redis DLQ for background retry
  }
};
