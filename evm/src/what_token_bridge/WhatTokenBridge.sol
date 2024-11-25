// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.19;

import "modules/wormhole/IWormhole.sol";
import "modules/utils/BytesLib.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./WhatTokenBridgeGetters.sol";
import "./WhatTokenBridgeMessages.sol";
import "./WhatTokenBridgeErrors.sol";

/**
 * @title WhatTokenBridge
 * @notice This contract handles locking tokens on the source chain and
 *         sending a message via Wormhole to unlock tokens on the destination chain.
 */
contract WhatTokenBridge is
    WhatTokenBridgeGetters,
    WhatTokenBridgeMessages,
    WhatTokenBridgeErrors,
    ReentrancyGuard
{
    using BytesLib for bytes;

    /**
     * @notice Initializes the WhatTokenBridge contract.
     * @param wormhole_ Address of the Wormhole contract.
     * @param chainId_ ID of the chain this contract is deployed on.
     * @param wormholeFinality_ The number of block confirmations required for finality.
     * @param feePrecision_ Precision of the fee calculation.
     * @param relayerFeePercentage_ Percentage of the transferred tokens used as relayer fee.
     */
    constructor(
        address wormhole_,
        uint16 chainId_,
        uint8 wormholeFinality_,
        uint32 feePrecision_,
        uint32 relayerFeePercentage_
    ) {
        if (wormhole_ == address(0)) {
            revert WormholeZeroAddress();
        }

        if (chainId_ == 0) {
            revert WrongChainId();
        }

        if (wormholeFinality_ == 0) {
            revert WrongWormholeFinality();
        }

        setOwner(msg.sender);
        setWormhole(wormhole_);
        setChainId(chainId_);
        setWormholeFinality(wormholeFinality_);
        setFeePrecision(feePrecision_);
        setRelayerFeePercentage(relayerFeePercentage_);
    }

    /**
     * @notice Locks tokens in the contract and sends a message via Wormhole.
     * @param recipient Address on the destination chain that will receive the tokens.
     * @param amount The amount of tokens to be locked and sent.
     * @return messageSequence The sequence number of the Wormhole message.
     */
    function lockAndSend(
        bytes32 recipient,
        uint256 amount
    ) public payable nonReentrant returns (uint64 messageSequence) {
        if (recipient == bytes32(0)) {
            revert RecipientZeroAddress();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        IWormhole wormhole = wormhole();
        uint256 wormholeFee = wormhole.messageFee();

        if (msg.value < wormholeFee) {
            revert InvalidWormholeFeeAmount();
        }

        // Custody tokens and get the actual amount received after possible fees
        uint256 amountReceived = custodyTokens(whatToken(), amount);

        // Create a TransferMessage and encode it for Wormhole transfer
        TransferMessage memory parsedMessage = TransferMessage({
            payloadID: uint8(1),
            recipient: recipient,
            amount: amountReceived
        });

        bytes memory encodedMessage = encodeMessage(parsedMessage);

        // Publish the message via Wormhole and return the sequence
        messageSequence = wormhole.publishMessage{value: wormholeFee}(
            0,
            encodedMessage,
            wormholeFinality()
        );
    }

    /**
     * @notice Redeems the locked tokens and unlocks them on this chain.
     *         The relayer is rewarded with a fee for redeeming the message.
     * @param encodedMessage The Wormhole message containing token transfer details.
     */
    function redeemAndUnlock(bytes memory encodedMessage) public {
        (
            IWormhole.VM memory wormholeMessage,
            bool valid,
            string memory reason
        ) = wormhole().parseAndVerifyVM(encodedMessage);

        require(valid, reason);

        if (!verifyEmitter(wormholeMessage)) {
            revert WrongEmitterAddress();
        }

        // Decode the transfer message
        TransferMessage memory parsedMessage = decodeMessage(
            wormholeMessage.payload
        );

        // Ensure the message hasn't been consumed before
        if (isMessageConsumed(wormholeMessage.hash)) {
            revert VaaAlreadyClaimed();
        }

        // Convert the recipient from bytes32 to address
        address recipient = bytes32ToAddress(parsedMessage.recipient);

        uint256 amountTransferred = parsedMessage.amount;

        // Calculate the fee for the relayer
        uint256 relayerFee = calculateRelayerFee(amountTransferred);

        address whatTokenAddress = whatToken();

        if (relayerFee == 0) {
            // Transfer the full amount to the recipient if no relayer fee
            SafeERC20.safeTransfer(
                IERC20(whatTokenAddress),
                recipient,
                amountTransferred
            );
        } else {
            // Pay the relayer and transfer the remaining amount to the recipient
            SafeERC20.safeTransfer(
                IERC20(whatTokenAddress),
                msg.sender,
                relayerFee
            );

            SafeERC20.safeTransfer(
                IERC20(whatTokenAddress),
                recipient,
                amountTransferred - relayerFee
            );
        }

        // Mark the message as consumed to prevent re-use
        consumeMessage(wormholeMessage.hash, recipient, parsedMessage.amount);
    }

   /**
     * @notice Registers foreign emitters (HelloToken contracts) with this contract
     * @dev Only the deployer (owner) can invoke this method
     * @param emitterChainId Wormhole chainId of the contract being registered.
     * See https://book.wormhole.com/reference/contracts.html for more information.
     * @param emitterAddress 32-byte address of the contract being registered. For EVM
     * contracts the first 12 bytes should be zeros.
     */
    function registerEmitter(
        uint16 emitterChainId,
        bytes32 emitterAddress
    ) public onlyOwner {
        if (emitterChainId == 0) {
            revert WrongEmitterChainId();
        }

        if (emitterChainId == chainId()) {
            revert WrongEmitterChainId();
        }

        if (emitterAddress == bytes32(0)) {
            revert WormholeZeroAddress();
        }

        setEmitter(emitterChainId, emitterAddress);
    }

    /**
     * @notice Sets the token contract address for the bridge.
     * @param whatToken Address of the token contract.
     */
    function setWhatTokenAddress(address whatToken) public onlyOwner {
        setWhatToken(whatToken);
    }

    /**
     * @notice Transfers tokens from the user to the contract.
     * @param token Address of the token contract.
     * @param amount The amount of tokens to transfer.
     * @return The actual amount of tokens received by the contract.
     */
    function custodyTokens(
        address token,
        uint256 amount
    ) internal returns (uint256) {
        uint256 balanceBefore = getBalance(token);

        // Transfer tokens from the sender to the contract
        SafeERC20.safeTransferFrom(
            IERC20(token),
            msg.sender,
            address(this),
            amount
        );

        // Return the difference in balance to account for any transfer fees
        return getBalance(token) - balanceBefore;
    }

    function getBalance(address token) internal view returns (uint256 balance) {
        // Call to retrieve the token balance
        (, bytes memory queriedBalance) = token.staticcall(
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(this))
        );
        balance = abi.decode(queriedBalance, (uint256));
    }

    /**
     * @notice Converts an Ethereum address to a bytes32 representation.
     * @param address_ The address to convert.
     * @return The bytes32 representation of the address.
     */
    function addressToBytes32(
        address address_
    ) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(address_)));
    }

    /**
     * @notice Calculates the relayer fee based on the transferred amount.
     * @param amount The amount of tokens being transferred.
     * @return The calculated relayer fee.
     */
    function calculateRelayerFee(uint256 amount) public view returns (uint256) {
        return (amount * relayerFeePercentage()) / feePrecision();
    }

    /**
     * @notice Converts a bytes32 to an Ethereum address.
     * @param address_ The bytes32 address to convert.
     * @return The Ethereum address.
     */
    function bytes32ToAddress(
        bytes32 address_
    ) internal pure returns (address) {
        if (bytes12(address_) != 0) {
            revert InvalidEVMAddress();
        }
        return address(uint160(uint256(address_)));
    }

    /**
     * @notice Verifies if the emitter is valid based on the chain ID and address.
     * @param vm The Wormhole VM message.
     * @return True if the emitter is valid, otherwise false.
     */
    function verifyEmitter(
        IWormhole.VM memory vm
    ) internal view returns (bool) {
        return getRegisteredEmitter(vm.emitterChainId) == vm.emitterAddress;
    }

    /**
     * @notice Retrieves the token decimals by calling the token contract.
     * @param token The token contract address.
     * @return The number of decimals used by the token.
     */
    function getDecimals(address token) internal view returns (uint8) {
        (, bytes memory queriedDecimals) = token.staticcall(
            abi.encodeWithSignature("decimals()")
        );
        return abi.decode(queriedDecimals, (uint8));
    }

    /**
     * @notice Ensures the caller is the contract owner.
     */
    modifier onlyOwner() {
        require(owner() == msg.sender, "caller not the owner");
        _;
    }
}
