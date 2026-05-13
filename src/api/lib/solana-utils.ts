import { TransactionMessage, VersionedTransaction, TransactionInstruction } from '@solana/web3.js';

/**
 * Appends instructions to a base64 encoded VersionedTransaction.
 * Note: This invalidates any existing signatures on the transaction.
 */
export function appendInstructionsToTransaction(
  base64Transaction: string,
  newInstructions: TransactionInstruction[]
): string {
  const transaction = VersionedTransaction.deserialize(Buffer.from(base64Transaction, 'base64'));
  
  // Decompile the message to get existing instructions and settings
  // Note: decompile() works for both legacy and v0 messages
  const message = TransactionMessage.decompile(transaction.message);
  
  // Add new instructions to the end
  message.instructions.push(...newInstructions);
  
  // Re-compile to v0 message (or same as original if preferred, but v0 is standard for modern apps)
  const newCompiledMessage = message.compileToV0Message();
  const newTransaction = new VersionedTransaction(newCompiledMessage);
  
  return Buffer.from(newTransaction.serialize()).toString('base64');
}
