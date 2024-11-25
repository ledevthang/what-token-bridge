// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

import "modules/utils/BytesLib.sol";

import "./WhatTokenBridgeStructs.sol";

contract WhatTokenBridgeMessages is WhatTokenBridgeStructs {
    using BytesLib for bytes;

    function encodeMessage(
        TransferMessage memory parsedMessage
    ) public pure returns (bytes memory encodedMessage) {
        encodedMessage = abi.encodePacked(
            parsedMessage.payloadID,
            parsedMessage.recipient,
            parsedMessage.amount
        );
    }

    function decodeMessage(
        bytes memory encodedMessage
    ) public pure returns (TransferMessage memory parsedMessage) {
        uint256 index = 0;

        parsedMessage.payloadID = encodedMessage.toUint8(index);
        require(parsedMessage.payloadID == 1, "invalid payloadID");
        index += 1;

        parsedMessage.recipient = encodedMessage.toBytes32(index);
        index += 32;

        parsedMessage.amount = encodedMessage.toUint256(index);
        index += 32;        
        require(index == encodedMessage.length, "invalid message length");
    }
}
