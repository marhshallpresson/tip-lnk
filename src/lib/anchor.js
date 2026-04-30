import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../../tiplnk_anchor/target/idl/tipstack.json";

export const PROGRAM_ID = new PublicKey(idl.metadata.address);

/**
 * Professional Anchor Program Interface
 * Encapsulates all on-chain tipping logic for Tip Stack.
 */
export function getTiplnkProgram(connection, wallet) {
  if (!wallet) return null;

  const provider = new AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: "confirmed" }
  );

  return new Program(idl, PROGRAM_ID, provider);
}

/**
 * Prepares the accounts for an SPL token tip.
 */
export async function getSendTokenAccounts(sender, creator, tokenMint) {
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  
  const senderTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    sender
  );
  
  const creatorTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    creator
  );

  return {
    sender,
    tokenMint,
    senderTokenAccount,
    creatorTokenAccount,
    creator,
    tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  };
}
