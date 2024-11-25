import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { WhatTokenBridge } from "../../ts/sdk/what_transfer_token_bridge";
import { config } from "dotenv";
config();

export async function initialize(
  whatTokenBridgeProgram: WhatTokenBridge,
  connection: Connection,
  wallet: Keypair,
  whatTokenMint: PublicKey,
  relayerFee: number
) {
  const tx = await whatTokenBridgeProgram.initialize(
    wallet.publicKey,
    relayerFee,
    whatTokenMint
  );
  const txHash = await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log(
    `Initialize what token brigde at tx: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
  );
}
