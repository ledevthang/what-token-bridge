use anchor_lang::prelude::*;

use crate::{constants::SEED_PREFIX_CONFIG, ConfigAccount, WhatTokenBridgeError};

#[derive(Accounts)]
pub struct RemoveWhitelists<'info> {
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
pub struct WhitelistRemovedEvent {
    pub owner: Pubkey,
    pub removed_whitelists: Vec<Pubkey>,
}

pub fn remove_whitelists(ctx: Context<RemoveWhitelists>, whitelists: Vec<Pubkey>) -> Result<()> {
    let config_account = &mut ctx.accounts.config_account;
    let mut removed_whitelists = Vec::new();

    for whitelist in whitelists.iter() {
        if let Some(index) = config_account.whitelists.iter().position(|x| x == whitelist) {
            config_account.whitelists.remove(index);
            removed_whitelists.push(*whitelist);
        }
    }

    emit!(WhitelistRemovedEvent {
        owner: *ctx.accounts.owner.key,
        removed_whitelists,
    });

    Ok(())
}
