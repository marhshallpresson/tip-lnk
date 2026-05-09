import { 
  KaminoMarket, 
  KaminoAction, 
  VanillaObligation, 
  PROGRAM_ID 
} from "@kamino-finance/klend-sdk";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import Decimal from "decimal.js";

const MAIN_MARKET = new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");

const MINT_MAP: Record<string, string> = {
  "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "SOL": "So11111111111111111111111111111111111111112",
};

export async function getKaminoDepositInstructions(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: string,
  tokenSymbol: string = "USDC"
): Promise<TransactionInstruction[]> {
  const market = await KaminoMarket.load(connection as any, MAIN_MARKET as any, 400);
  if (!market) {
    throw new Error("Failed to load Kamino Market");
  }

  const mint = MINT_MAP[tokenSymbol] || tokenSymbol;

  // ─── ELITE SECURITY: ORACLE FRESHNESS ───
  // According to Kamino docs, market.refreshAll() is mandatory before building transactions
  // to ensure interest rates and Scope price feeds are not stale.
  await market.refreshAll();
  
  const kaminoAction = await KaminoAction.buildDepositTxns(
    market,
    amount,
    mint as any,
    userPublicKey as any,
    new VanillaObligation(PROGRAM_ID),
    true, // useV2Ixs
    undefined, // scopeRefreshConfig
    0, // extraComputeBudget
    true, // includeAtaIxs
  );

  return [
    ...(kaminoAction.setupIxs as any),
    ...(kaminoAction.lendingIxs as any),
    ...(kaminoAction.cleanupIxs as any),
  ] as TransactionInstruction[];
}
