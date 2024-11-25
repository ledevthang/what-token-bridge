use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod helper;
pub mod instructions;
pub mod message;
pub mod state;

use error::*;
use instructions::*;
use message::*;
use state::*;

declare_id!("H2A4zRKip3vL652k6sxXtSYRTbnzBrrREvAjPKu7nAr");

#[program]
pub mod what_token_bridge {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee: u64) -> Result<()> {
        instructions::initialize(ctx, fee)?;
        Ok(())
    }

    pub fn transfer_ownership(
        ctx: Context<TransferOwnership>,
        new_owner_candidate: Pubkey,
    ) -> Result<()> {
        instructions::transfer_ownership(ctx, new_owner_candidate)?;
        Ok(())
    }

    pub fn confirm_ownership_transfer(ctx: Context<ConfirmOwnershipTransfer>) -> Result<()> {
        instructions::confirm_ownership_transfer(ctx)?;
        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, args: UpdateConfigArgs) -> Result<()> {
        instructions::update_config(ctx, args)?;
        Ok(())
    }

    pub fn register_emitter(
        ctx: Context<RegisterEmitter>,
        chain: u16,
        address: [u8; 32],
    ) -> Result<()> {
        instructions::register_emitter(ctx, chain, address)?;
        Ok(())
    }

    pub fn lock_and_send(
        ctx: Context<LockAndSend>,
        amount: u64,
        recipient_address: [u8; 32],
    ) -> Result<()> {
        instructions::lock_and_send(ctx, amount, &recipient_address)?;
        Ok(())
    }

    pub fn redeem_and_unlock(ctx: Context<RedeemAndUnlock>, vaa_hash: [u8; 32]) -> Result<()> {
        instructions::redeem_and_unlock(ctx, vaa_hash)?;
        Ok(())
    }

    pub fn add_whitelists(ctx: Context<AddWhitelists>, whitelists: Vec<Pubkey>) -> Result<()> {
        instructions::add_whitelists(ctx, whitelists)?;
        Ok(())
    }

    pub fn remove_whitelists(
        ctx: Context<RemoveWhitelists>,
        whitelists: Vec<Pubkey>,
    ) -> Result<()> {
        instructions::remove_whitelists(ctx, whitelists)?;
        Ok(())
    }
}
