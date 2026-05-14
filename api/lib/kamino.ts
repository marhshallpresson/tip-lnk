import { Connection, PublicKey, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { appendInstructionsToTransaction } from "./solana-utils.js";

const MAIN_MARKET = new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");

const MINT_MAP: Record<string, string> = {
  "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "SOL": "So11111111111111111111111111111111111111112",
};

/**
 * Builds Kamino deposit instructions. 
 * Supports both standard and "Connectless" flows by resolving instructions 
 * independently of transaction state.
 */
export async function getKaminoDepositInstructions(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: string,
  tokenSymbol: string = "USDC"
): Promise<TransactionInstruction[]> {
  const { KaminoMarket, KaminoAction, VanillaObligation, PROGRAM_ID } = await import("@kamino-finance/klend-sdk");
  
  const market = await KaminoMarket.load(connection as any, MAIN_MARKET as any, 400);
  if (!market) {
    throw new Error("Failed to load Kamino Market");
  }

  const mint = MINT_MAP[tokenSymbol] || tokenSymbol;

  // ─── ELITE SECURITY: ORACLE FRESHNESS ───
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

/**
 * Attaches Kamino yield instructions to an existing transaction.
 */
export async function attachKaminoYield(
  connection: Connection,
  base64Transaction: string,
  userPublicKey: PublicKey,
  amount: string,
  tokenSymbol: string = "USDC"
): Promise<string> {
  try {
    const kaminoIxs = await getKaminoDepositInstructions(
      connection,
      userPublicKey,
      amount,
      tokenSymbol
    );
    
    return appendInstructionsToTransaction(base64Transaction, kaminoIxs);
  } catch (err: any) {
    console.error("Failed to attach Kamino yield:", err.message);
    return base64Transaction;
  }
}

/**
 * CONNECTLESS FLOW: Returns just the Kamino instructions for a given user.
 * Useful for building Solana Pay Action payloads where the user is unknown 
 * until the transaction is actually executed.
 */
export async function getKaminoYieldPayload(
    connection: Connection,
    userPublicKey: PublicKey,
    amount: string,
    tokenSymbol: string = "USDC"
) {
    const instructions = await getKaminoDepositInstructions(connection, userPublicKey, amount, tokenSymbol);
    return {
        instructions: instructions.map(ix => ({
            programId: ix.programId.toBase58(),
            data: Buffer.from(ix.data).toString('base64'),
            keys: ix.keys.map(k => ({
                pubkey: k.pubkey.toBase58(),
                isSigner: k.isSigner,
                isWritable: k.isWritable
            }))
        }))
    };
}
