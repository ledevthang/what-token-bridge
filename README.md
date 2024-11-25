# What Token Bridge

## Prerequisites

### EVM

If your xChain app will require EVM smart contracts, we recommend using [Foundry tools](https://book.getfoundry.sh/getting-started/installation), which include `forge`, `anvil` and `cast` CLI tools.

#### Testing
``` make test ```

### Solana

If your xChain app will require Solana programs, prepare your development environment by installing [Solana and Anchor dependencies](https://book.anchor-lang.com/getting_started/installation.html), which include `solana` and `anchor` CLI tools.

Anchor helps in abstracting solana architecture boilerplate code. However, it has its own challenges so you can still write programs in native rust, download ['rust-analyzer'](https://rust-analyzer.github.io/) to debug and write efficient rust.
#### Testing

1. Run command ```solana address``` to get your address
2. Replace your address  at file ***initialize.rs*** by your address
```
const OWNER: Pubkey = pubkey!("YOUR ADDRESS");
```
3. ``` anchor test -- --features mainnet``` (Wormhole using mainnet same as localnet)
