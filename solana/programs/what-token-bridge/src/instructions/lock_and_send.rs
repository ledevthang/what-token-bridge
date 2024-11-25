use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount},
};
use primitive_types::U256;
use wormhole_anchor_sdk::wormhole::{self, program::Wormhole};

use crate::{
    constants::{SEED_PREFIX_CONFIG, SEED_PREFIX_MESSAGE},
    helper::{get_transfer_fee, transfer_token_to_pool},
    ConfigAccount, WhatTokenBridgeError, WhatTokenBridgeMessage,
};
pub type EvmAddress = [u8; 32];

#[derive(AnchorSerialize)]
struct SendMessage<'a> {
    recipient_address: &'a EvmAddress,
}

#[derive(Accounts)]
pub struct LockAndSend<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub what_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        constraint = config_account.what_mint == what_mint.key() @ WhatTokenBridgeError::InvalidMint
    )]
    pub config_account: Box<Account<'info, ConfigAccount>>,

    #[account(
        mut,
        constraint = vault_token_account.owner == config_account.key() @ WhatTokenBridgeError::InvalidTokenOwner,
        constraint = vault_token_account.mint == what_mint.key() @ WhatTokenBridgeError::InvalidMint
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [SEED_PREFIX_MESSAGE, &(config_account.sequence + 1).to_le_bytes()],
        bump,
      )]
    /// CHECK: initialized and written to by wormhole core bridge
    pub wormhole_message: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: account will be checked and maybe initialized by the wormhole core bridge
    pub wormhole_sequence: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: address will be checked by the wormhole core bridge
    pub wormhole_bridge: Account<'info, wormhole::BridgeData>,

    #[account(
        mut,
        seeds = [wormhole::FeeCollector::SEED_PREFIX],
        bump,
        seeds::program = wormhole_program.key
    )]
    pub wormhole_fee_collector: Account<'info, wormhole::FeeCollector>,

    pub wormhole_program: Program<'info, Wormhole>,

    pub token_2022_program: Program<'info, Token2022>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub clock: Sysvar<'info, Clock>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct LockAndSendEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
    pub sequence: u64,
}

pub fn lock_and_send(ctx: Context<LockAndSend>, amount: u64, recipient: &EvmAddress) -> Result<()> {
    let clock = Clock::get()?;

    transfer_token_to_pool(
        ctx.accounts.user_token_account.to_account_info(),
        ctx.accounts.vault_token_account.to_account_info(),
        ctx.accounts.user.to_account_info(),
        ctx.accounts.token_2022_program.to_account_info(),
        ctx.accounts.what_mint.clone(),
        amount,
    )?;

    let amount_transfer_fee = get_transfer_fee(ctx.accounts.what_mint.clone(), amount).unwrap();

    //transfer Wormhole fee to fee collector account if nessesary
    if ctx.accounts.wormhole_bridge.fee() > 0 {
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.wormhole_fee_collector.to_account_info(),
                },
            ),
            ctx.accounts.wormhole_bridge.fee(),
        )?;
    }

    let message_bump = ctx.bumps.wormhole_message;

    let finalized_amount = amount.checked_sub(amount_transfer_fee).unwrap();

    let payload: Vec<u8> = WhatTokenBridgeMessage::TransferPayload {
        recipient: *recipient,
        amount: U256::from(finalized_amount).to_big_endian(),
    }
    .try_to_vec()?;

    let sequence = ctx.accounts.config_account.sequence.clone();

    wormhole::post_message(
        CpiContext::new_with_signer(
            ctx.accounts.wormhole_program.to_account_info(),
            wormhole::PostMessage {
                config: ctx.accounts.wormhole_bridge.to_account_info(),
                message: ctx.accounts.wormhole_message.to_account_info(),
                emitter: ctx.accounts.config_account.to_account_info(),
                sequence: ctx.accounts.wormhole_sequence.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                fee_collector: ctx.accounts.wormhole_fee_collector.to_account_info(),
                clock: ctx.accounts.clock.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            &[
                &[SEED_PREFIX_CONFIG, &[ctx.accounts.config_account.bump]],
                &[
                    SEED_PREFIX_MESSAGE,
                    &(sequence + 1).to_le_bytes(),
                    &[message_bump],
                ],
            ],
        ),
        0,
        payload,
        wormhole::Finality::Finalized,
    )?;

    ctx.accounts.config_account.sequence += 1;

    emit!(LockAndSendEvent {
        user: *ctx.accounts.user.key,
        amount: finalized_amount,
        timestamp: clock.unix_timestamp,
        sequence: sequence
    });

    Ok(())
}
