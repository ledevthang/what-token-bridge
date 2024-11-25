import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "dotenv";
import { WhatTokenBridge } from "../ts/sdk/what_transfer_token_bridge";
config();

const connection = new Connection(clusterApiUrl("devnet"));
const SOLANA_WORMHOLE_BRIGDE = new PublicKey(
  process.env.SOLANA_WORMHOLE_BRIDGE_ID!
);
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY!)
);

export async function getEmitterAddress() {
  const whatTokenMint = new PublicKey(
    "9VbTuNNGHuFbYEjBUSwq6guypeo1mSkyCxNMpsjhh5HH"
  );
  const whatTokenBridgeProgram = new WhatTokenBridge(
    connection,
    whatTokenMint,
    SOLANA_WORMHOLE_BRIGDE
  );

  const emitterAddress = whatTokenBridgeProgram.configPDA.toString();
  console.log('emitterAddress:',emitterAddress)
}

getEmitterAddress();
