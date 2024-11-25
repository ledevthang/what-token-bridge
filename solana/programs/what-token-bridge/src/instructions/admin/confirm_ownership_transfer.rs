use anchor_lang::prelude::*;

use crate::{ConfigAccount, WhatTokenBridgeError};

#[derive(Accounts)]
pub struct ConfirmOwnershipTransfer<'info> {
    #[account(mut)]
    pub owner_candidate: Signer<'info>,
    #[account(
        mut,
        constraint = config_account.owner_candidate == owner_candidate.key() @ WhatTokenBridgeError::InvalidOwnerCandidate
    )]
    pub config_account: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}

pub fn confirm_ownership_transfer(
    ctx: Context<ConfirmOwnershipTransfer>,
) -> Result<()> {
    let config_account = &mut ctx.accounts.config_account;

    config_account.owner = ctx.accounts.owner_candidate.key();

    Ok(())
}
