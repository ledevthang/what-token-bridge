use anchor_lang::prelude::*;


#[derive(Default, AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct WormholeAddresses {
    pub bridge: Pubkey,
    pub fee_collector: Pubkey,
    pub sequence: Pubkey,
}

impl WormholeAddresses {
    pub const LEN: usize =
          32 // config
        + 32 // fee_collector
        + 32 // sequence
    ;
}

#[account]
#[derive(Default)]
pub struct ConfigAccount {
    pub owner: Pubkey,
    pub owner_candidate: Pubkey,
    pub wormhole: WormholeAddresses,
    pub bump: u8,
    pub fee: u64,
    pub sequence: u64,
    pub what_mint: Pubkey,
    pub whitelist_enabled: bool,
    pub whitelists: Vec<Pubkey>,
    pub finality: u8,
}

impl ConfigAccount {
    pub const LEN: usize = 8
        + 32 
        + 32
        + 8
        + WormholeAddresses::LEN
        + 1  
        + 4  
        + 1  
        + 4  
        + 32 * 250 
        + 1; 
}
