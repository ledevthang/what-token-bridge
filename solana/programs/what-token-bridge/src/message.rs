use anchor_lang::{AnchorDeserialize, AnchorSerialize};
use std::io;
use wormhole_io::Readable;

const PAYLOAD_ID_TRANSFER: u8 = 1;

#[derive(Clone)]
pub enum WhatTokenBridgeMessage {
    TransferPayload {
        recipient: [u8; 32],
        amount: [u8; 32],
    },
}

impl AnchorSerialize for WhatTokenBridgeMessage {
    fn serialize<W: io::Write>(&self, writer: &mut W) -> io::Result<()> {
        match self {
            WhatTokenBridgeMessage::TransferPayload { recipient, amount } => {
                PAYLOAD_ID_TRANSFER.serialize(writer)?;
                recipient.serialize(writer)?;
                amount.serialize(writer)?;
                Ok(())
            }
        }
    }
}

impl AnchorDeserialize for WhatTokenBridgeMessage {
    fn deserialize_reader<R: io::Read>(reader: &mut R) -> io::Result<Self> {
        match u8::read(reader)? {
            PAYLOAD_ID_TRANSFER => {
                let recipient = <[u8; 32]>::read(reader)?;
                let mut amount_bytes = [0u8; 32];
                reader.read_exact(&mut amount_bytes)?;
                Ok(WhatTokenBridgeMessage::TransferPayload {
                    recipient,
                    amount: amount_bytes,
                })
            },
            _ => Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid payload ID",
            )),
        }
    }
}
