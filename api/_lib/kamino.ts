import { 
  KaminoMarket, 
  KaminoAction, 
  VanillaObligation, 
  PROGRAM_ID 
} from "@kamino-finance/klend-sdk";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import Decimal from "decimal.js";

const MAIN_MARKET = new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF");

export async function getKaminoDepositInstructions(
  connection: Connection,
  userPublicKey: PublicKey,
  amount: string,
  tokenSymbol: string = "USDC"
): Promise<TransactionInstruction[]> {
  const market = await KaminoMarket.load(connection, MAIN_MARKET);
  if (!market) {
    throw new Error("Failed to load Kamino Market");
  }

  // Build deposit transaction instructions
  // Note: For a tip, we want the creator (recipient) to be the one whose obligation is funded.
  // However, the SENDER is the one signing. 
  // In Kamino, you can deposit into another user's obligation.
  
  const kaminoAction = await KaminoAction.buildDepositTxns(
    market,
    amount,
    tokenSymbol,
    userPublicKey, // The person signing and providing the funds
    new VanillaObligation(PROGRAM_ID), // Standard obligation
    0,
    true, // Include ATA init
    undefined,
    undefined,
    "confirmed"
  );

  return [
    ...kaminoAction.setupIxs,
    ...kaminoAction.lendingIxs,
    ...kaminoAction.cleanupIxs,
  ];
}
