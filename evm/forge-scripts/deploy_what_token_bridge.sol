// SPDX-License-Identifier: Apache 2

pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {IWormhole} from "modules/wormhole/IWormhole.sol";
import {WhatTokenBridge} from "contracts/what_token_bridge/WhatTokenBridge.sol";

contract ContractScript is Script {
    IWormhole wormhole;
    WhatTokenBridge whatTokenBridge;

    function setUp() public {
        wormhole = IWormhole(vm.envAddress("TESTING_WORMHOLE_ADDRESS"));
    }

    function deployWhatTokenBridge() public {
        whatTokenBridge = new WhatTokenBridge(
            address(wormhole),
            wormhole.chainId(),
            1, // wormholeFinality
            1e6, // feePrecision
            10000 // relayerFee (percentage terms)
        );
    }

    function run() public {
        vm.startBroadcast();

        deployWhatTokenBridge();

        vm.stopBroadcast();
    }
}
