use anchor_lang::prelude::*;

use crate::{ConfigAccount, WhatTokenBridgeError};

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        constraint = config_account.owner == *owner.key @ WhatTokenBridgeError::Unauthorized
    )]
    pub config_account: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}

pub fn transfer_ownership(
    ctx: Context<TransferOwnership>,
    new_owner_candidate: Pubkey,
) -> Result<()> {
    let config_account = &mut ctx.accounts.config_account;

    config_account.owner_candidate = new_owner_candidate;

    Ok(())
}
