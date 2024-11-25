import bs58 from "bs58";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { config } from "dotenv";
import { WhatTokenBridge } from "../ts/sdk/what_transfer_token_bridge";
import { initialize } from "./whatTokenBridge/initialize";
import { mintWhatToken } from "./whatToken/mint_what_token";
import { registerEmitter } from "./whatTokenBridge/register_emitter";
import { sleep } from "./utils";
import { ChainId } from "@certusone/wormhole-sdk";
config();

const connection = new Connection(clusterApiUrl("devnet"));
const SOLANA_WORMHOLE_BRIGDE = new PublicKey(
  process.env.SOLANA_WORMHOLE_BRIDGE_ID!
);
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY!)
);

export async function setUpBridge() {
  const whatTokenMint = new PublicKey(process.env.WHAT_MINT!);
  const whatTokenBridgeProgram = new WhatTokenBridge(
    connection,
    whatTokenMint,
    SOLANA_WORMHOLE_BRIGDE
  );

  console.log("EMITTER ADDRESS: ", whatTokenBridgeProgram.configPDA);
  /* -----------------------------------------------INITIALIZE PROGRAM------------------------------------------------- */
  const relayerFee = 0; //0.1 %;
  await initialize(
    whatTokenBridgeProgram,
    connection,
    wallet,
    whatTokenMint,
    relayerFee
  );
  await sleep(2000);

  /* ------------------------------------------------------------------MINT WHAT TOKEN TO VAULT--------------------------------------------------- */
  const amount = 1_000_000 * 10 ** 6;
  await mintWhatToken(
    connection,
    wallet,
    whatTokenMint,
    whatTokenBridgeProgram.configPDA,
    amount
  );
  await sleep(2000);

  /* ----------------------------------------------------------------REGISTER EMITTER FROM BASE----------------------------------------------------- */
  const emitter = process.env.BASE_EMITTER_ADDRESS!;
  const chainId = process.env.BASE_CHAIN_ID!;
  await registerEmitter(
    whatTokenBridgeProgram,
    connection,
    wallet,
    emitter,
    Number(chainId) as ChainId
  );
}

setUpBridge();
