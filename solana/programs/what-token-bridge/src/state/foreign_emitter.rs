use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct ForeignEmitter {
    pub chain: u16,
    pub address: [u8; 32],
}

impl ForeignEmitter {
    pub const MAXIMUM_SIZE: usize = 8
        + 2
        + 32
    ;
    pub const SEED_PREFIX: &'static [u8; 15] = b"foreign_emitter";

    pub fn verify(&self, address: &[u8; 32]) -> bool {
        *address == self.address
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::mem::size_of;

    #[test]
    fn test_foreign_emitter() -> Result<()> {
        assert_eq!(
            ForeignEmitter::MAXIMUM_SIZE,
            size_of::<u64>() + size_of::<u16>() + size_of::<[u8; 32]>()
        );

        let chain = 2u16;
        let address = [
            4u8, 20u8, 6u8, 9u8, 4u8, 20u8, 6u8, 9u8, 4u8, 20u8, 6u8, 9u8, 4u8, 20u8, 6u8, 9u8,
            4u8, 20u8, 6u8, 9u8, 4u8, 20u8, 6u8, 9u8, 4u8, 20u8, 6u8, 9u8, 4u8, 20u8, 6u8, 9u8,
        ];
        let foreign_emitter = ForeignEmitter { chain, address };
        assert!(
            foreign_emitter.verify(&address),
            "foreign_emitter.verify(address) failed"
        );

        Ok(())
    }
}
