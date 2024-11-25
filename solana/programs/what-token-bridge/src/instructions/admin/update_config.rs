use anchor_lang::prelude::*;

use crate::{ConfigAccount, WhatTokenBridgeError};

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        constraint = config_account.owner == *owner.key @ WhatTokenBridgeError::Unauthorized
    )]
    pub config_account: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct UpdateConfigEvent {
    pub new_fee: Option<u64>,
    pub new_whitelist_enabled: Option<bool>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateConfigArgs {
    pub new_fee: Option<u64>,
    pub whitelist_enabled: Option<bool>,
}

pub fn update_config(ctx: Context<UpdateConfig>, args: UpdateConfigArgs) -> Result<()> {
    let config_account = &mut ctx.accounts.config_account;

    if let Some(fee) = args.new_fee {
        config_account.fee = fee;
    }

    if let Some(whitelist_enabled) = args.whitelist_enabled {
        config_account.whitelist_enabled = whitelist_enabled;
    }
    emit!(UpdateConfigEvent {
        new_fee: args.new_fee,
        new_whitelist_enabled: args.whitelist_enabled,
    });

    Ok(())
}
