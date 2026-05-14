import { config } from 'dotenv';
config();

export const getEnv = (key: string) => process.env[key] || '';

export const BIRDEYE_API_KEY = getEnv('BIRDEYE_API_KEY');
export const QUICKNODE_RPC_URL = getEnv('VITE_SOLANA_RPC_URL');
export const DFLOW_API_KEY = getEnv('VITE_DFLOW_API_KEY');
export const JUPITER_API_KEY = getEnv('JUPITER_API_KEY');
