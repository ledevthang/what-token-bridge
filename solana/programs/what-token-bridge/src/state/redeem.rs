use anchor_lang::prelude::*;

pub const MESSAGE_MAX_LENGTH: usize = 1024;

#[account]
#[derive(Default)]
pub struct Received {
    pub batch_id: u32,
    pub wormhole_message_hash: [u8; 32],
    pub amount: u64,
    pub recipient: Pubkey,
}

impl Received {
    pub const MAXIMUM_SIZE: usize = 8 // discriminator
        + 4 // batch_id
        + 32 // wormhole_message_hash
        + 8 // amount (u64)
        + 32 // recipient (Pubkey)
    ;
    /// AKA `b"received"`.
    pub const SEED_PREFIX: &'static [u8; 8] = b"received";
}

#[cfg(test)]
mod test {
    use super::*;
    use std::mem::size_of;

    #[test]
    fn test_received() -> Result<()> {
        assert_eq!(
            Received::MAXIMUM_SIZE,
            size_of::<u8>() * 8 // discriminator
                + size_of::<u32>() // batch_id
                + size_of::<[u8; 32]>() // wormhole_message_hash
                + size_of::<u64>() // amount
                + size_of::<Pubkey>() // recipient
        );

        Ok(())
    }
}
