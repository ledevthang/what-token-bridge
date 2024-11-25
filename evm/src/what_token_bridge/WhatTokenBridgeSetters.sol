// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

import "./WhatTokenBridgeState.sol";

contract WhatTokenBridgeSetters is WhatTokenBridgeState {
    function setOwner(address owner_) internal {
        _state.owner = owner_;
    }

    function setWormhole(address wormhole_) internal {
        _state.wormhole = payable(wormhole_);
    }

    function setWhatToken(address whatToken_) internal {
        _state.whatToken = whatToken_;
    }

    function setChainId(uint16 chainId_) internal {
        _state.chainId = chainId_;
    }

    function setWormholeFinality(uint8 finality) internal {
        _state.wormholeFinality = finality;
    }

    function setEmitter(uint16 chainId, bytes32 emitter) internal {
        _state.registeredEmitters[chainId] = emitter;
    }

    function setFeePrecision(uint32 feePrecision_) internal {
        _state.feePrecision = feePrecision_;
    }

    function setRelayerFeePercentage(uint32 relayerFeePercentage_) internal {
        _state.relayerFeePercentage = relayerFeePercentage_;
    }

    function setPaused(bool paused) internal {
        _state.isPaused = paused;
    }

    function setWhitelistEnabled(bool enabled) internal {
        _state.whitelistEnbled = enabled;
    }

    function setWhitelist(address account, bool enabled) internal {
        _state.whitelist[account] = enabled;
    }

    function consumeMessage(
        bytes32 hash,
        address recipient,
        uint256 amount
    ) internal {
        _state.receivedMessages[hash].recipient = recipient;
        _state.receivedMessages[hash].amount = amount;
        _state.consumedMessages[hash] = true;
    }
}
