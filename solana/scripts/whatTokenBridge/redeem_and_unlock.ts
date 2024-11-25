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
import { ParsedVaa, SignedVaa } from "@certusone/wormhole-sdk";
import { postSignedMsgAsVaaOnSolana } from "../utils";
config();

const connection = new Connection(clusterApiUrl("devnet"));

const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY!)
);
async function redeemAndUnlock(recipient: PublicKey, wormholeMessage: string) {
  const SOLANA_WORMHOLE_BRIGDE = new PublicKey(
    process.env.SOLANA_WORMHOLE_BRIDGE_ID!
  );

  const whatTokenMint = new PublicKey(process.env.WHAT_MINT!);

  const whatTokenBridgeProgram = new WhatTokenBridge(
    connection,
    whatTokenMint,
    SOLANA_WORMHOLE_BRIGDE
  );

  const signedVaa = Buffer.from(wormholeMessage, "base64");
  await postSignedMsgAsVaaOnSolana(
    connection,
    signedVaa,
    wallet,
    new PublicKey("3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5")
  );

  const tx = await whatTokenBridgeProgram.redeemAndUnlock(
    wallet.publicKey,
    signedVaa
  );

  const txHash = await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log(
    `Redeem what token brigde at tx: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
  );
}
const vaa =
  "AQAAAAABAEAzwcZJ53jE0tb6gNTarHqswP5IgRyxqpAms5K/ZLObXw7xxegSZl/pe03TVd/+yJnVxP189n28uMlLfhVLVjEAZ0J6YAAAAAAnEgAAAAAAAAAAAAAAAA9przKfI0haKTWDiLDGIZSdzqi1AAAAAAAAAAgBAeujMSwSpauTtfZq81LVYLhwhJuFoEaXk5QLFtMLFhlvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACYloA=";
redeemAndUnlock(wallet.publicKey, vaa);
