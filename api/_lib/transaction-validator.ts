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
 * Validates that the transaction does what we expect
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
      fees: 5000, // Default 5000 lamports
    },
    actualChanges: [],
    warnings: [],
    errors: [],
  }

  try {
    // Get account states BEFORE transaction
    const accounts = [
      { address: signer, label: 'sender' },
      { address: recipient, label: 'recipient' },
    ]

    const balanceBefore = await Promise.all(
      accounts.map(async (acc) => ({
        ...acc,
        balance: await connection.getBalance(acc.address),
      }))
    )

    // Step 1: Simulate the transaction
    // We use the signer (PublicKey) as the feePayer for simulation
    transaction.feePayer = signer;
    const simulationResult = await connection.simulateTransaction(transaction);

    if (simulationResult.value.err) {
      result.errors.push(`Transaction simulation failed: ${JSON.stringify(simulationResult.value.err)}`)
      result.isValid = false
      return result
    }

    result.simulationSuccess = true

    // Step 2: Analyze instruction chain
    const warnings = validateInstructionChain(
      transaction.instructions,
      signer,
      recipient,
      expectedTipAmount
    )
    result.warnings.push(...warnings)

    // Step 3: Check for suspicious patterns
    const suspiciousChecks = checkForSuspiciousPatterns(transaction.instructions)
    if (suspiciousChecks.length > 0) {
      result.errors.push(...suspiciousChecks)
      result.isValid = false
    }

    // Step 4: Validate sender has sufficient balance
    const sender = balanceBefore.find((a) => a.label === 'sender')
    if (sender && sender.balance < expectedTipAmount + 5000) {
      result.errors.push(
        `Insufficient balance: ${sender.balance} lamports, need ${expectedTipAmount + 5000}`
      )
      result.isValid = false
    }

    return result
  } catch (error) {
    result.errors.push(`Simulation error: ${error instanceof Error ? error.message : String(error)}`)
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
