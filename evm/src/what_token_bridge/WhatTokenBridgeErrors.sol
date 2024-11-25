// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

contract WhatTokenBridgeErrors {
    error WormholeZeroAddress();
    error WhatTokenZeroAddress();
    error InvalidEVMAddress();
    error WrongChainId();
    error WrongEmitterChainId();
    error WrongWormholeFinality();
    error WrongEmitterAddress();
    error FailedVaaParseAndVerification(string reason);
    error VaaAlreadyClaimed();
    error InvalidMessageLength();
    error TransferFailed();
    error RecipientZeroAddress();
    error InvalidAmount();
    error InvalidWormholeFeeAmount();
    error InsufficientContractBalance();
}
