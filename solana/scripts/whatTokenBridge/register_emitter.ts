import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { WhatTokenBridge } from "../../ts/sdk/what_transfer_token_bridge";
import { config } from "dotenv";
import {
  CHAIN_ID_SEPOLIA,
  ChainId,
  tryNativeToUint8Array,
} from "@certusone/wormhole-sdk";
config();

export async function registerEmitter(
  whatTokenBridgeProgram: WhatTokenBridge,
  connection: Connection,
  wallet: Keypair,
  emitter: string,
  chainId: ChainId
) {
  const emitterBuffer = tryNativeToUint8Array(emitter, chainId);

  const tx = await whatTokenBridgeProgram.registerEmitter(
    wallet.publicKey,
    CHAIN_ID_SEPOLIA,
    Buffer.from(emitterBuffer)
  );
  const txHash = await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log(
    `Register emitter what token brigde at tx: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
  );
}
