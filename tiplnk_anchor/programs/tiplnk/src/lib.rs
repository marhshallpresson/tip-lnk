use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod tiplnk {
    use super::*;

    /// Process a standard SOL tip.
    pub fn send_sol_tip(ctx: Context<SendSolTip>, amount: u64, message: String) -> Result<()> {
        require!(amount > 0, TipError::InvalidAmount);
        require!(message.len() <= 200, TipError::MessageTooLong);

        // Transfer SOL
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.sender.key(),
            &ctx.accounts.creator.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.sender.to_account_info(),
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Emit an event for indexers
        emit!(TipEvent {
            sender: ctx.accounts.sender.key(),
            creator: ctx.accounts.creator.key(),
            token_mint: None,
            amount,
            message,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Process an SPL Token tip (e.g., USDC, BONK).
    pub fn send_token_tip(ctx: Context<SendTokenTip>, amount: u64, message: String) -> Result<()> {
        require!(amount > 0, TipError::InvalidAmount);
        require!(message.len() <= 200, TipError::MessageTooLong);

        // Transfer SPL Token
        let transfer_instruction = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        token::transfer(cpi_ctx, amount)?;

        // Emit an event for indexers
        emit!(TipEvent {
            sender: ctx.accounts.sender.key(),
            creator: ctx.accounts.creator.key(),
            token_mint: Some(ctx.accounts.token_mint.key()),
            amount,
            message,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SendSolTip<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    /// CHECK: The recipient should be a valid SystemAccount
    #[account(mut)]
    pub creator: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendTokenTip<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    
    /// CHECK: Read-only mint verification
    pub token_mint: AccountInfo<'info>,

    #[account(
        mut,
        constraint = sender_token_account.mint == token_mint.key(),
        constraint = sender_token_account.owner == sender.key()
    )]
    pub sender_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = creator_token_account.mint == token_mint.key(),
        constraint = creator_token_account.owner == creator.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// CHECK: The recipient owner
    pub creator: SystemAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct TipEvent {
    pub sender: Pubkey,
    pub creator: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub amount: u64,
    pub message: String,
    pub timestamp: i64,
}

#[error_code]
pub enum TipError {
    #[msg("The tip amount must be greater than zero.")]
    InvalidAmount,
    #[msg("The attached message exceeds the 200 character limit.")]
    MessageTooLong,
}
