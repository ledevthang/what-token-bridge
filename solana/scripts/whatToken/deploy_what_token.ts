import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createTransferFeeConfigToken } from "../utils";

export async function deployWhatToken(
  connection: Connection,
  wallet: Keypair,
  decimals: number
): Promise<PublicKey> {
  const whatTokenMint = await createTransferFeeConfigToken(
    connection,
    wallet,
    decimals
  );

  console.log(
    `Deploy what token at address: https://explorer.solana.com/address/${whatTokenMint}?cluster=devnet`
  );

  return whatTokenMint;
}
