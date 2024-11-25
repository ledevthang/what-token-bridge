use anchor_lang::prelude::*;
use wormhole_anchor_sdk::wormhole;

use crate::{ConfigAccount, ForeignEmitter, WhatTokenBridgeError};

#[derive(Accounts)]
#[instruction(chain: u16)]
pub struct RegisterEmitter<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
      mut,
      constraint = config_account.owner == *owner.key  @ WhatTokenBridgeError::Unauthorized
    )]
    pub config_account: Account<'info, ConfigAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        seeds = [
            ForeignEmitter::SEED_PREFIX,
            &chain.to_le_bytes()[..]
        ],
        bump,
        space = ForeignEmitter::MAXIMUM_SIZE
    )]
    pub foreign_emitter: Account<'info, ForeignEmitter>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct EmitterRegisteredEvent {
    pub chain: u16,
    pub address: [u8; 32],
}

pub fn register_emitter(
    ctx: Context<RegisterEmitter>,
    chain: u16,
    address: [u8; 32],
) -> Result<()> {
    require!(
        chain > 0 && chain != wormhole::CHAIN_ID_SOLANA && !address.iter().all(|&x| x == 0),
        WhatTokenBridgeError::InvalidForeignEmitter,
    );

    let emitter = &mut ctx.accounts.foreign_emitter;
    emitter.chain = chain;
    emitter.address = address;

    emit!(EmitterRegisteredEvent { chain, address });

    Ok(())
}
