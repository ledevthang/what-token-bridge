import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "dotenv";
import { mintWhatToken } from "./whatToken/mint_what_token";
import { sleep } from "./utils";
config();

const connection = new Connection(clusterApiUrl("devnet"));
const wallet = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY!)
);

export async function setToken() {
  //deploy what mint
  const decimals = 6;
  // const whatTokenMint = await deployWhatToken(connection, wallet, decimals);
  // await sleep(2000);

  const whatTokenMint = new PublicKey(
    "9VbTuNNGHuFbYEjBUSwq6guypeo1mSkyCxNMpsjhh5HH"
  );

  //mint what token to owner
  const amount = 1_000_000 * 10 ** decimals;
  await mintWhatToken(
    connection,
    wallet,
    whatTokenMint,
    wallet.publicKey,
    amount
  );
  await sleep(2000);
}

setToken();
