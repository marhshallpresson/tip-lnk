import { Connection } from '@solana/web3.js';

/**
 * PHASE 1: INFRASTRUCTURE LAYER - Multi-RPC Strategy
 * Implements fault-tolerant RPC connection with automatic failover.
 */

const RPC_ENDPOINTS = [
  process.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com', // Primary (QuickNode / Helius)
  process.env.SECONDARY_RPC_URL || 'https://solana-mainnet.rpc.extnode.com', // Secondary
  'https://api.mainnet-beta.solana.com' // Tertiary (Public Fallback)
];

class RpcManager {
  private currentIndex = 0;
  private connections: Connection[];

  constructor() {
    this.connections = RPC_ENDPOINTS.map(url => new Connection(url, 'confirmed'));
  }

  public getConnection(): Connection {
    return this.connections[this.currentIndex];
  }

  public reportFailure() {
    console.warn(`🛡️ RPC Manager: Failover triggered. Endpoint ${RPC_ENDPOINTS[this.currentIndex]} failed.`);
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    console.log(`🛡️ RPC Manager: Switched to ${RPC_ENDPOINTS[this.currentIndex]}`);
  }

  /**
   * Wraps an RPC call with automatic failover and exponential backoff
   */
  public async executeWithFailover<T>(operation: (conn: Connection) => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      try {
        const conn = this.getConnection();
        return await operation(conn);
      } catch (error: any) {
        lastError = error;
        // Check if error is related to network/timeout
        if (error.message.includes('fetch') || error.message.includes('timeout') || error.message.includes('503')) {
          this.reportFailure();
        }
        
        attempt++;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`RPC Operation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }
}

export const rpcManager = new RpcManager();
