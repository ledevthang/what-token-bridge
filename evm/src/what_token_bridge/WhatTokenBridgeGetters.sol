// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

import "modules/wormhole/IWormhole.sol";
import "./WhatTokenBridgeSetters.sol";
import "./WhatTokenBridgeMessages.sol";
import "./WhatTokenBridgeState.sol";

contract WhatTokenBridgeGetters is WhatTokenBridgeSetters {
    function owner() public view returns (address) {
        return _state.owner;
    }

    function wormhole() public view returns (IWormhole) {
        return IWormhole(_state.wormhole);
    }

    function whatToken() public view returns (address) {
        return _state.whatToken;
    }

    function chainId() public view returns (uint16) {
        return _state.chainId;
    }

    function wormholeFinality() public view returns (uint8) {
        return _state.wormholeFinality;
    }

    function getRegisteredEmitter(uint16 emitterChainId) public view returns (bytes32) {
        return _state.registeredEmitters[emitterChainId];
    }

    function getReceivedMessage(bytes32 hash) public view returns (address recipient, uint256 amount) {
        WhatTokenBridgeStorage.Lock memory message = _state.receivedMessages[hash];
        return (message.recipient, message.amount);
    }

    function isMessageConsumed(bytes32 hash) public view returns (bool) {
        return _state.consumedMessages[hash];
    }

    function feePrecision() public view returns (uint32) {
        return _state.feePrecision;
    }

    function relayerFeePercentage() public view returns (uint32) {
        return _state.relayerFeePercentage;
    }

    function isPaused() public view returns (bool) {
        return _state.isPaused;
    }

    function isWhitelistEnabled() public view returns (bool) {
        return _state.whitelistEnbled;
    }

    function isWhitelisted(address account) public view returns (bool) {
        return _state.whitelist[account];
    }
}
