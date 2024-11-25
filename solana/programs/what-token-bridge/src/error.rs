use anchor_lang::prelude::error_code;

#[error_code]
pub enum WhatTokenBridgeError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid owner candidate")]
    InvalidOwnerCandidate,

    #[msg("InvalidMint")]
    InvalidMint,

    #[msg("Invalid token owner")]
    InvalidTokenOwner,

    #[msg("InvalidWormholeBridge")]
    InvalidWormholeBridge,

    #[msg("InvalidWormholeFeeCollector")]
    InvalidWormholeFeeCollector,

    #[msg("InvalidWormholeEmitter")]
    InvalidWormholeEmitter,

    #[msg("InvalidWormholeSequence")]
    InvalidWormholeSequence,

    #[msg("InvalidSysvar")]
    InvalidSysvar,

    #[msg("OwnerOnly")]
    OwnerOnly,

    #[msg("Overflow")]
    Overflow,

    #[msg("BumpNotFound")]
    BumpNotFound,

    #[msg("InvalidForeignContract")]
    InvalidForeignContract,

    #[msg("ZeroBridgeAmount")]
    ZeroBridgeAmount,

    #[msg("InvalidTokenBridgeConfig")]
    InvalidTokenBridgeConfig,

    #[msg("InvalidTokenBridgeAuthoritySigner")]
    InvalidTokenBridgeAuthoritySigner,

    #[msg("InvalidTokenBridgeCustodySigner")]
    InvalidTokenBridgeCustodySigner,

    #[msg("InvalidTokenBridgeEmitter")]
    InvalidTokenBridgeEmitter,

    #[msg("InvalidTokenBridgeSequence")]
    InvalidTokenBridgeSequence,

    #[msg("InvalidTokenBridgeSender")]
    InvalidTokenBridgeSender,

    #[msg("InvalidRecipient")]
    InvalidRecipient,

    #[msg("InvalidTransferTokenAccount")]
    InvalidTransferTokenAccount,

    #[msg("InvalidTransferTokenChain")]
    InvalidTransferToChain,

    #[msg("InvalidTransferTokenChain")]
    InvalidTransferTokenChain,

    #[msg("InvalidRelayerFee")]
    InvalidRelayerFee,

    #[msg("InvalidPayerAta")]
    InvalidPayerAta,

    #[msg("InvalidTransferToAddress")]
    InvalidTransferToAddress,

    #[msg("AlreadyRedeemed")]
    AlreadyRedeemed,

    #[msg("InvalidTokenBridgeForeignEndpoint")]
    InvalidTokenBridgeForeignEndpoint,

    #[msg("NonExistentRelayerAta")]
    NonExistentRelayerAta,

    #[msg("InvalidTokenBridgeMintAuthority")]
    InvalidTokenBridgeMintAuthority,

    #[msg("InvalidData")]
    InvalidData,

    #[msg("InvalidForeignEmitter")]
    InvalidForeignEmitter,
}
