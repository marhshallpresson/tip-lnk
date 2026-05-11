import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PublicKey, TransactionInstruction, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
// @ts-ignore
import { appendInstructionsToTransaction } from './solana-utils.js';

describe('solana-utils', () => {
  describe('appendInstructionsToTransaction', () => {
    test('appends instructions to a versioned transaction', async () => {
      const payer = new PublicKey('11111111111111111111111111111111');
      const instructions = [
        new TransactionInstruction({
          keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
          programId: new PublicKey('11111111111111111111111111111111'),
          data: Buffer.from([1, 2, 3]),
        }),
      ];
      const messageV0 = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: '11111111111111111111111111111111',
        instructions,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
      const base64Tx = Buffer.from(transaction.serialize()).toString('base64');

      const extraInstructions = [
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey('11111111111111111111111111111111'),
          data: Buffer.from([4, 5, 6]),
        }),
      ];

      const resultBase64 = appendInstructionsToTransaction(base64Tx, extraInstructions);
      
      const resultTx = VersionedTransaction.deserialize(Buffer.from(resultBase64, 'base64'));
      assert.strictEqual(resultTx.message.compiledInstructions.length, 2);
    });

    test('throws error for invalid base64 transaction', () => {
      assert.throws(() => {
        appendInstructionsToTransaction('invalid-base64', []);
      });
    });
  });
});
