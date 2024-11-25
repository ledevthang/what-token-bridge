# WhatTokenBridge
## Overview
The `WhatTokenBridge` contract is a decentralized cross-chain token bridge utilizing Wormhole's messaging infrastructure. It facilitates the locking of tokens on one blockchain and the unlocking of corresponding tokens on another blockchain. The bridge uses Wormhole to send verified messages that allow users to transfer tokens cross-chain safely and securely.

## Feature
- **Token Locking and Transfer**: Tokens are locked in the source chain and transferred cross-chain using Wormhole's secure messaging system. The destination chain unlocks the tokens once the transfer is verified.
- **Relayer Support**: Incentivizes relayers by offering a fee based on a configurable percentage of the transferred tokens.
- **Multi-Chain Support**: The contract supports communication between multiple blockchains by registering foreign token bridge contracts (emitters) through Wormhole.
- **Security Features**: Uses ReentrancyGuard to prevent reentrancy attacks and ensures secure token custody and unlocking.
  
## Prerequisites
- **Wormhole Contract**: A deployed Wormhole contract on both source and destination chains.
- **ERC20 Token**: The token being transferred must be an ERC20-compliant token.
- **Foreign Emitter Registration**: The bridge must register trusted emitters (other WhatTokenBridge contracts) on foreign chains to ensure messages originate from valid sources.

## Detailed Design
The `WhatTokenBridge` contract utilizes Wormhole's cross-chain messaging protocol to lock tokens on the source blockchain and unlock corresponding tokens on the destination blockchain. It supports contract-controlled token transfers between a network of smart contracts across different blockchains.

### Registering Foreign Emitters
Before the `WhatTokenBridge` contracts can send and receive token transfers, the contract owner must invoke the `registerEmitter` method to register trusted `WhatTokenBridge` contracts on other blockchains. This ensures that any message received by the contract is sent from a registered `WhatTokenBridge` contract on another chain.

The owner uses the following method to register emitters on other blockchains:

```solidity
function registerEmitter(uint16 emitterChainId, bytes32 emitterAddress) public onlyOwner

```
- `emitterChainId`: Wormhole chain ID of the contract being registered.
- `emitterAddress`: The bytes32 address of the WhatTokenBridge contract on the other chain.

This step is critical for securing cross-chain interactions, as it ensures that only messages from trusted contracts are processed.

### Locking Tokens and Sending Cross-Chain Messages

To initiate a token transfer, the user must lock tokens on the source chain and send a message to the destination chain using the `lockAndSend` method. The tokens are locked in the `WhatTokenBridge` contract, and a Wormhole message is generated, which includes the details of the transfer, such as the recipient's address and the amount of tokens being transferred.

```solidity
function lockAndSend(
    bytes32 recipient,
    uint256 amount
) public payable nonReentrant returns (uint64 messageSequence)
```
- `recipient`: The address of the wallet on the target blockchain that will receive the tokens (in bytes32 format).
- `amount`: The quantity of tokens to be transferred.

Once the tokens are locked in the WhatTokenBridge contract, a message is generated and sent via the Wormhole network using the publishMessage function. The message contains a custom payload that includes the transfer amount and the recipient’s address.

The Wormhole guardians will then attest the message after a specified number of block confirmations, known as the `wormholeFinality` parameter.

### Payload Structure

The `lockAndSend` method encodes a custom payload that includes the recipient's address and the amount of tokens being transferred. The structure of this payload is as follows:

```solidity
struct TransferMessage {
    uint8 payloadID; // identifier for the message type
    bytes32 recipient; // recipient's address on the target chain
    uint256 amount; // amount of tokens to be transferred
}
```
This encoded message is then passed to Wormhole, which ensures that the message reaches the destination chain after attestation by Wormhole guardians.

### Unlocking Tokens on the Destination Chain
Once the message has been attested by the Wormhole guardians on the source chain, the recipient or a relayer must invoke the redeemAndUnlock function on the WhatTokenBridge contract on the destination chain. This function verifies the Wormhole message and unlocks the corresponding amount of tokens for the recipient on the destination chain.

```solidity
function redeemAndUnlock(bytes memory encodedMessage) public
```
- `encodedMessage`: The attested Wormhole message containing the token transfer details.

Once the attested message is received on the destination chain, the following steps are completed:

1. **Verification**: The contract calls Wormhole’s parseAndVerifyVM to verify the authenticity of the message. It checks whether the message originated from a registered WhatTokenBridge contract on the source chain.

2. **Decoding the Payload**: The message payload is decoded to extract the transfer details, such as the recipient’s address and the amount of tokens.

3. **Message Replay Protection**: The contract ensures that the message has not already been redeemed (replay protection). If the message has been processed before, the transaction is reverted.

4. **Relayer Fee Calculation**: The contract calculates the relayer fee (if applicable). The relayer fee is a percentage of the transferred tokens, which is sent to the relayer as compensation for facilitating the transfer.

5. **Token Transfer**: The contract transfers the remaining tokens to the recipient on the destination chain. If the relayer is the one redeeming the transfer, they are rewarded with a portion of the tokens (as determined by the relayerFeePercentage).

### EVM Interface

```solidity
function lockAndSend(
  bytes32 recipient,
  uint256 amount
) public payable nonReentrant returns (uint64 messageSequence)

function redeemAndUnlock(bytes memory encodedMessage) public

function calculateRelayerFee(uint256 amount) public view returns (uint256)

function registerEmitter(uint16 emitterChainId, bytes32 emitterAddress) public
```

### SOLANA Interface

```rust
pub fn initialize(ctx: Context<Initialize>, fee: u64) -> Result<()> {
    instructions::initialize(ctx, fee)?;
    Ok(())
}

pub fn update_config(
    ctx: Context<UpdateConfig>,
    fee: Option<u64>,
    new_owner: Option<Pubkey>,
    whitelist_enabled: Option<bool>,
) -> Result<()> {
    instructions::update_config(ctx, fee, new_owner, whitelist_enabled)?;
    Ok(())
}

pub fn register_emitter(
    ctx: Context<RegisterEmitter>,
    chain: u16,
    address: [u8; 32],
) -> Result<()> {
    instructions::register_emitter(ctx, chain, address)?;
    Ok(())
}

pub fn lock_and_send(
    ctx: Context<LockAndSend>,
    amount: u64,
    recipient_address: [u8; 20],
) -> Result<()> {
    instructions::lock_and_send(ctx, amount, &recipient_address)?;
    Ok(())
}

pub fn redeem_what(ctx: Context<RedeemWhat>, vaa_hash: [u8; 32]) -> Result<()> {
    instructions::redeem_what(ctx, vaa_hash)?;
    Ok(())
}

pub fn add_whitelists(ctx: Context<AddWhitelists>, whitelists: Vec<Pubkey>) -> Result<()> {
    instructions::add_whitelists(ctx, whitelists)?;
    Ok(())
}

pub fn remove_whitelists(
    ctx: Context<RemoveWhitelists>,
    whitelists: Vec<Pubkey>,
) -> Result<()> {
    instructions::remove_whitelists(ctx, whitelists)?;
    Ok(())
}
```