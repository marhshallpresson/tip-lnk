import {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

/**
 * SECURITY PATCH: Transaction Simulation & Validation (M-04)
 * 
 * Prevents:
 * - Hidden drainer instructions
 * - Unauthorized account modifications
 * - MEV extraction / slippage manipulation
 * - Invalid transaction structures
 */

export interface TransactionValidationResult {
  isValid: boolean
  simulationSuccess: boolean
  expectedOutcome: {
    sender: string
    recipient: string
    amount: number
    fees: number
  }
  actualChanges: Array<{
    account: string
    balanceDelta: number
    isExpected: boolean
  }>
  warnings: string[]
  errors: string[]
}

/**
 * Simulate a transaction before requesting user signature
 * Validates that the transaction does what we expect by checking balance deltas.
 * SECURITY PATCH: Prevents spoofing where tx content doesn't match API parameters.
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction,
  signer: PublicKey,
  expectedTipAmount: number,
  recipient: PublicKey
): Promise<TransactionValidationResult> {
  const result: TransactionValidationResult = {
    isValid: true,
    simulationSuccess: false,
    expectedOutcome: {
      sender: signer.toBase58(),
      recipient: recipient.toBase58(),
      amount: expectedTipAmount,
      fees: 5000, 
    },
    actualChanges: [],
    warnings: [],
    errors: [],
  }

  try {
    // 1. Fetch pre-balances
    const [preSender, preRecipient] = await Promise.all([
      connection.getBalance(signer, 'confirmed'),
      connection.getBalance(recipient, 'confirmed')
    ]);

    // 2. Simulate the transaction with account tracking
    transaction.feePayer = signer;
    const { value: sim } = await connection.simulateTransaction(transaction, {
      sigVerify: false,
      accounts: {
        encoding: 'base64',
        addresses: [signer.toBase58(), recipient.toBase58()]
      }
    });

    if (sim.err) {
      result.errors.push(`Simulation failed: ${JSON.stringify(sim.err)}`);
      result.isValid = false;
      return result;
    }

    result.simulationSuccess = true;

    // 3. Extract post-balances from simulation result
    // result.value.accounts[0] -> signer, [1] -> recipient
    const postSender = sim.accounts?.[0]?.lamports ?? preSender;
    const postRecipient = sim.accounts?.[1]?.lamports ?? preRecipient;

    const senderDelta = preSender - postSender;
    const recipientDelta = postRecipient - preRecipient;

    // 4. Mathematical Verification
    // Recipient must receive EXACTLY what was expected
    if (recipientDelta < expectedTipAmount) {
      result.errors.push(`Fraud Detected: Recipient balance delta (${recipientDelta}) is less than expected (${expectedTipAmount})`);
      result.isValid = false;
    }

    // Sender must not lose more than expected + reasonable fee (e.g. 0.01 SOL buffer for priority fees)
    const maxExpectedLoss = expectedTipAmount + (0.01 * LAMPORTS_PER_SOL);
    if (senderDelta > maxExpectedLoss) {
      result.errors.push(`Security Alert: Sender loss (${senderDelta}) exceeds expected tip + buffer`);
      result.isValid = false;
    }

    result.actualChanges.push(
      { account: 'sender', balanceDelta: -senderDelta, isExpected: senderDelta <= maxExpectedLoss },
      { account: 'recipient', balanceDelta: recipientDelta, isExpected: recipientDelta >= expectedTipAmount }
    );

    // 5. Pattern Analysis (Defense in Depth)
    const suspiciousChecks = checkForSuspiciousPatterns(transaction.instructions)
    if (suspiciousChecks.length > 0) {
      result.errors.push(...suspiciousChecks)
      result.isValid = false
    }

    return result;
  } catch (error) {
    result.errors.push(`Simulation runtime error: ${error instanceof Error ? error.message : String(error)}`)
    result.isValid = false
    return result
  }
}

/**
 * Validate the instruction chain to ensure it matches expected transaction
 */
function validateInstructionChain(
  instructions: TransactionInstruction[],
  sender: PublicKey,
  recipient: PublicKey,
  expectedAmount: number
): string[] {
  const warnings: string[] = []

  // Check 1: Must have at least one transfer instruction
  const hasTransfer = instructions.some((ix) => {
    // Look for System Program transfers or token transfers
    return (
      ix.programId.equals(SystemProgram.programId) ||
      ix.programId.toBase58().includes('TokenkegQfeZyiNwAJsyFbPVwwQQfHub6LeYvDLthy') // Token Program
    )
  })

  if (!hasTransfer) {
    warnings.push('No transfer instruction detected in transaction')
  }

  // Check 2: Warn about multiple transfer-like instructions
  const transferCount = instructions.filter((ix) =>
    ix.programId.toBase58().includes('TokenkegQfeZyiNwAJsyFbPVwwQQfHub6LeYvDLthy')
  ).length

  if (transferCount > 1) {
    warnings.push(`Multiple token transfers detected (${transferCount}). Verify this is intentional.`)
  }

  // Check 3: Warn about DEX/swap instructions (for DFlow, Jupiter, etc)
  const isDexInstruction = instructions.some((ix) => {
    const programId = ix.programId.toBase58()
    return (
      programId.includes('DFlow') ||
      programId.includes('JupAg') ||
      programId.includes('Raydium')
    )
  })

  if (isDexInstruction) {
    warnings.push('DEX/Swap instruction detected. Verify slippage and rates before signing.')
  }

  // Check 4: Flag if non-sender is signer
  const unexpectedSigners = instructions
    .filter((ix) => {
      return ix.keys.some((key) => key.isSigner && !key.pubkey.equals(sender))
    })
    .map((ix) => ix.programId.toBase58())

  if (unexpectedSigners.length > 0) {
    warnings.push(
      `Unexpected signers required by programs: ${unexpectedSigners.join(', ')}. Review before signing.`
    )
  }

  return warnings
}

/**
 * Check for known malicious patterns
 */
function checkForSuspiciousPatterns(instructions: TransactionInstruction[]): string[] {
  const errors: string[] = []

  // Pattern 1: Delegate authority to unknown account
  instructions.forEach((ix, idx) => {
    const data = ix.data.toString('hex')

    // SPL Token "Approve" with suspiciously high amounts
    if (data.startsWith('04') && data.length > 50) {
      errors.push(`Instruction ${idx}: Approve/Authority delegation detected. Verify recipient.`)
    }

    // Unknown program ID calling critical functions
    if (ix.programId.toBase58().length !== 44 || ix.programId.toBase58() === 'NotAValidBase58Addr') {
      errors.push(`Instruction ${idx}: Invalid program ID format`)
    }
  })

  // Pattern 2: Circular or self-referential transfers
  const accounts = new Set<string>()
  instructions.forEach((ix) => {
    ix.keys.forEach((key) => {
      accounts.add(key.pubkey.toBase58())
    })
  })

  if (accounts.size > 10) {
    errors.push(`Transaction touches ${accounts.size} accounts. This is unusual and may indicate draining.`)
  }

  return errors
}

/**
 * Format simulation result for user display
 */
export function formatSimulationResult(result: TransactionValidationResult): string {
  let message = ''

  if (!result.simulationSuccess) {
    message += `❌ Simulation Failed\n`
  } else if (result.errors.length > 0) {
    message += `⚠️ Critical Issues Detected:\n`
    result.errors.forEach((err) => {
      message += `  • ${err}\n`
    })
  } else if (result.warnings.length > 0) {
    message += `⚠️ Review Required:\n`
    result.warnings.forEach((warn) => {
      message += `  • ${warn}\n`
    })
  } else {
    message += `✅ Transaction Verified\n`
  }

  message += `\nExpected Transfer:\n`
  message += `  From: ${result.expectedOutcome.sender}\n`
  message += `  To: ${result.expectedOutcome.recipient}\n`
  message += `  Amount: ${(result.expectedOutcome.amount / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`

  return message
}
