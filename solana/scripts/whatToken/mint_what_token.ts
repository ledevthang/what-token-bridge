import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { mintTransferHookTokenTo } from "../utils";

export async function mintWhatToken(
  connection: Connection,
  wallet: Keypair,
  whatTokenMint: PublicKey,
  recipient: PublicKey,
  amount: number
): Promise<String> {
  const txHash = await mintTransferHookTokenTo(
    connection,
    wallet,
    recipient,
    whatTokenMint,
    amount
  );

  console.log(
    `Mint ${amount} what token at tx: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
  );
  return txHash;
}
