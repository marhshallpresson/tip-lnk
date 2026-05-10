import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Tipstack } from "../target/types/tipstack";
import { 
  PublicKey, 
  SystemProgram, 
  Keypair, 
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo 
} from "@solana/spl-token";
import { assert } from "chai";

describe("tipstack", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Tipstack as Program<Tipstack>;
  const sender = Keypair.generate();
  const creator = Keypair.generate();

  before(async () => {
    // Airdrop SOL to sender
    const sig = await provider.connection.requestAirdrop(sender.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);
  });

  it("Sends a SOL tip successfully", async () => {
    const amount = new anchor.BN(0.1 * LAMPORTS_PER_SOL);
    const message = "Great content!";

    const initialBalance = await provider.connection.getBalance(creator.publicKey);

    await program.methods
      .sendSolTip(amount, message)
      .accounts({
        sender: sender.publicKey,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    const finalBalance = await provider.connection.getBalance(creator.publicKey);
    assert.equal(finalBalance - initialBalance, amount.toNumber());
  });

  it("Fails if SOL amount is zero", async () => {
    try {
      await program.methods
        .sendSolTip(new anchor.BN(0), "Empty tip")
        .accounts({
          sender: sender.publicKey,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();
      assert.fail("Should have failed with InvalidAmount");
    } catch (err: any) {
      assert.include(err.message, "InvalidAmount");
    }
  });

  it("Sends a Token tip successfully (USDC simulation)", async () => {
    // 1. Create a dummy mint
    const mint = await createMint(
      provider.connection,
      sender,
      provider.wallet.publicKey,
      null,
      6
    );

    // 2. Create ATAs
    const senderAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      sender,
      mint,
      sender.publicKey
    );

    const creatorAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      sender,
      mint,
      creator.publicKey
    );

    // 3. Mint tokens to sender
    await mintTo(
      provider.connection,
      sender,
      mint,
      senderAta.address,
      provider.wallet.publicKey,
      100000000 // 100 USDC
    );

    const amount = new anchor.BN(5000000); // 5 USDC
    const message = "Thanks for the video!";

    await program.methods
      .sendTokenTip(amount, message)
      .accounts({
        sender: sender.publicKey,
        tokenMint: mint,
        senderTokenAccount: senderAta.address,
        creatorTokenAccount: creatorAta.address,
        creator: creator.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([sender])
      .rpc();

    const creatorBalance = await provider.connection.getTokenAccountBalance(creatorAta.address);
    assert.equal(creatorBalance.value.amount, amount.toString());
  });

  it("Fails if message is too long", async () => {
    const longMessage = "a".repeat(201);
    try {
      await program.methods
        .sendSolTip(new anchor.BN(1000), longMessage)
        .accounts({
          sender: sender.publicKey,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();
      assert.fail("Should have failed with MessageTooLong");
    } catch (err: any) {
      assert.include(err.message, "MessageTooLong");
    }
  });
});
