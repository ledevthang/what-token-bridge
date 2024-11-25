// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {WormholeSimulator, SigningWormholeSimulator} from "modules/wormhole/WormholeSimulator.sol";

import "contracts/what_token_bridge/WhatTokenBridge.sol";
import "contracts/what_token_bridge/WhatTokenBridgeStructs.sol";

/**
 * @title A Test Suite for the EVM WhatTokenBridge Contracts
 */
contract WhatTokenBridgeTest is Test {
    // guardian private key for simulated signing of Wormhole messages
    uint256 guardianSigner;

    // contract instances
    IWormhole wormhole;
    WormholeSimulator wormholeSimulator;
    WhatTokenBridge whatTokenBridgeSource;
    WhatTokenBridge whatTokenBridgeTarget;

    /**
     * @notice Sets up the wormholeSimulator contracts and deploys HelloWorld
     * contracts before each test is executed.
     */
    function setUp() public {
        // verify that we're using the correct fork (AVAX mainnet in this case)
        require(block.chainid == vm.envUint("TESTING_AVAX_FORK_CHAINID"), "wrong evm");

        // this will be used to sign Wormhole messages
        guardianSigner = uint256(vm.envBytes32("TESTING_DEVNET_GUARDIAN"));

        // we may need to interact with Wormhole throughout the test
        wormhole = IWormhole(vm.envAddress("TESTING_AVAX_WORMHOLE_ADDRESS"));

        // set up Wormhole using Wormhole existing on AVAX mainnet
        wormholeSimulator = new SigningWormholeSimulator(wormhole, guardianSigner);

        // verify Wormhole state from fork
        require(wormhole.chainId() == uint16(vm.envUint("TESTING_AVAX_WORMHOLE_CHAINID")), "wrong chainId");
        require(wormhole.messageFee() == vm.envUint("TESTING_AVAX_WORMHOLE_MESSAGE_FEE"), "wrong messageFee");
        require(
            wormhole.getCurrentGuardianSetIndex() == uint32(vm.envUint("TESTING_AVAX_WORMHOLE_GUARDIAN_SET_INDEX")),
            "wrong guardian set index"
        );

        // initialize "source chain" HelloWorld contract
        whatTokenBridgeSource = new WhatTokenBridge(address(wormhole), wormhole.chainId(), uint8(1), uint32(1000000), uint32(100000));

        // initialize "target chain" HelloWorld contract
        whatTokenBridgeTarget = new WhatTokenBridge(address(wormhole), uint8(2), uint8(1), uint32(1000000), uint32(100000));

        // confirm that the source and target contract addresses are different
        assertTrue(address(whatTokenBridgeSource) != address(whatTokenBridgeTarget));
    }

    /**
     * @notice This test confirms that the contracts are able to serialize and deserialize
     * the HelloWorld message correctly.
     */
    function testMessageDeserialization(
        bytes32 recipient,
        uint256 amount
    ) public {
        // encode the message by calling the encodeMessage method
        bytes memory encodedMessage = whatTokenBridgeSource.encodeMessage(
            WhatTokenBridgeStructs.TransferMessage({
                payloadID: uint8(1),
                recipient: recipient,
                amount: amount
            })
        );

        // decode the message by calling the decodeMessage method
        WhatTokenBridgeStructs.TransferMessage memory results = whatTokenBridgeSource.decodeMessage(encodedMessage);

        // verify the parsed output
        assertEq(results.payloadID, 1);
        assertEq(results.recipient, recipient);
        assertEq(results.amount, amount);

    }
}
