// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

contract WhatTokenBridgeStructs {

    struct TransferMessage {
        uint8 payloadID;
        bytes32 recipient;
        uint256 amount;
    }
}
