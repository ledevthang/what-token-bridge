import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { WhatTokenBridge } from "../../ts/sdk/what_transfer_token_bridge";
import { config } from "dotenv";
import { mintWhatToken } from "../whatToken/mint_what_token";
config();

const connection = new Connection(clusterApiUrl("devnet"));

const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY!)
);
async function lockAndSend() {
  const whatTokenMint = new PublicKey(process.env.WHAT_MINT!);

  const amount = 10 * 10 ** 6;

  await mintWhatToken(connection, wallet, whatTokenMint, wallet.publicKey, amount * 10000);
  const SOLANA_WORMHOLE_BRIGDE = new PublicKey(
    process.env.SOLANA_WORMHOLE_BRIDGE_ID!
  );


  const whatTokenBridgeProgram = new WhatTokenBridge(
    connection,
    whatTokenMint,
    SOLANA_WORMHOLE_BRIGDE
  );

  const recipient = "0x18d47411Cc717d3822c757F63528ccE250C7ad32";
  const emitterAddress = whatTokenBridgeProgram.configPDA;
  const tx = await whatTokenBridgeProgram.lockAndSend(
    wallet.publicKey,
    amount,
    recipient
  );

  await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    whatTokenMint,
    emitterAddress,
    true,
    "confirmed",
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  const txHash = await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log(
    `Send what token brigde at tx: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
  );
}

lockAndSend();
