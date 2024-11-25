use anchor_lang::prelude::*;

use crate::{constants::SEED_PREFIX_CONFIG, ConfigAccount, WhatTokenBridgeError};

#[derive(Accounts)]
pub struct AddWhitelists<'info> {
    #[account(
        mut,
        constraint = config_account.owner == *owner.key  @ WhatTokenBridgeError::Unauthorized
    )]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PREFIX_CONFIG],
        bump,
    )]
    pub config_account: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct WhitelistAddedEvent {
    pub owner: Pubkey,
    pub added_whitelists: Vec<Pubkey>,
}

pub fn add_whitelists(ctx: Context<AddWhitelists>, whitelists: Vec<Pubkey>) -> Result<()> {
    let config_account = &mut ctx.accounts.config_account;
    let mut added_whitelists = Vec::new();

    for whitelist in whitelists.iter() {
        if !config_account.whitelists.contains(whitelist) {
            config_account.whitelists.push(*whitelist);
            added_whitelists.push(*whitelist);
        }
    }

    emit!(WhitelistAddedEvent {
        owner: *ctx.accounts.owner.key,
        added_whitelists,
    });

    Ok(())
}
