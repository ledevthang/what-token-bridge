use anchor_lang::prelude::*;
use anchor_spl::{
    token::Token,
    token_2022::{
        self,
        spl_token_2022::{
            self,
            extension::{
                transfer_fee::TransferFeeConfig, BaseStateWithExtensions, StateWithExtensions,
            },
        },
    },
    token_interface::Mint,
};

use crate::{constants::BASIS_POINTS, ConfigAccount, WhatTokenBridgeError};

pub fn compute_adjusted_amount(
    config_account: &ConfigAccount,
    user_pubkey: &Pubkey,
    amount: u64,
) -> Result<u64> {
    let adjust_amount: u64;

    if config_account.whitelist_enabled {
        let is_whitelisted = config_account
            .whitelists
            .iter()
            .any(|whitelist_address| whitelist_address == user_pubkey);

        if is_whitelisted {
            adjust_amount = amount;
        } else {
            let fee_u128 = config_account.fee as u128;
            let basis_points_128 = BASIS_POINTS as u128;

            if fee_u128 > 0 {
                let fee = fee_u128
                    .checked_mul(amount as u128)
                    .and_then(|r| r.checked_div(basis_points_128))
                    .ok_or(WhatTokenBridgeError::Overflow)?;

                adjust_amount = amount
                    .checked_sub(fee as u64)
                    .ok_or(WhatTokenBridgeError::Overflow)?;
            } else {
                adjust_amount = amount;
            }
        }
    } else {
        adjust_amount = amount;
    }

    Ok(adjust_amount)
}

pub fn transfer_token_to_pool<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    mint: Box<InterfaceAccount<'info, Mint>>,
    amount: u64,
) -> Result<()> {
    let token_program_info = token_program.to_account_info();

    token_2022::transfer_checked(
        CpiContext::new(
            token_program_info,
            token_2022::TransferChecked {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
            },
        ),
        amount,
        mint.decimals,
    )
}

pub fn transfer_from_pool_to_user<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    mint: InterfaceAccount<'info, Mint>,
    amount: u64,
    signers: &[&[&[u8]]],
) -> Result<()> {
    let token_program_info = token_program.to_account_info();

    token_2022::transfer_checked(
        CpiContext::new_with_signer(
            token_program_info,
            token_2022::TransferChecked {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
            },
            signers,
        ),
        amount,
        mint.decimals,
    )
}

/// Calculate the fee for input amount
pub fn get_transfer_fee(
    mint_account: Box<InterfaceAccount<Mint>>,
    pre_fee_amount: u64,
) -> Result<u64> {
    let mint_info = mint_account.to_account_info();
    if *mint_info.owner == Token::id() {
        return Ok(0);
    }
    let mint_data = mint_info.try_borrow_data()?;
    let mint = StateWithExtensions::<spl_token_2022::state::Mint>::unpack(&mint_data)?;

    let fee = if let Ok(transfer_fee_config) = mint.get_extension::<TransferFeeConfig>() {
        transfer_fee_config
            .calculate_epoch_fee(Clock::get()?.epoch, pre_fee_amount)
            .unwrap()
    } else {
        0
    };
    Ok(fee)
}
