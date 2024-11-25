import {
  Keypair,
  Connection,
  Signer,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { CORE_BRIDGE_PID, MOCK_GUARDIANS } from "./consts";
import {
  NodeWallet,
  postVaaSolana,
} from "@certusone/wormhole-sdk/lib/cjs/solana";
import * as mock from "@certusone/wormhole-sdk/lib/cjs/mock";

export async function createUserWithLamports(
  connection: Connection,
  lamports: number
): Promise<Signer> {
  const account = Keypair.generate();
  const signature = await connection.requestAirdrop(
    account.publicKey,
    lamports * LAMPORTS_PER_SOL
  );
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ ...block, signature });
  return account;
}

export async function requestAirdrop(
  connection: Connection,
  recipient: PublicKey,
  lamports: number
) {
  const signature = await connection.requestAirdrop(
    recipient,
    lamports * LAMPORTS_PER_SOL
  );
  const block = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ ...block, signature });
}

export function publishAndSign(
  recipient: PublicKey,
  amount: bigint,
  emitter: mock.MockEmitter
) {
  const buf = Buffer.alloc(65);
  buf.writeUInt8(1, 0); //REDEEM PAYLOAD
  recipient.toBuffer().copy(buf, 1);
  const amountBuffer = Buffer.alloc(32);
  let amountHex = amount.toString(16).padStart(64, "0");
  Buffer.from(amountHex, "hex").copy(amountBuffer);
  amountBuffer.copy(buf, 33);
  const finality = 1;
  const batchId = 0;

  return guardianSign(emitter.publishMessage(batchId, buf, finality));
}

export function guardianSign(message: Buffer) {
  return MOCK_GUARDIANS.addSignatures(message, [0]);
}

export async function postSignedMsgAsVaaOnSolana(
  connection: Connection,
  signedMsg: Buffer,
  payer: Signer
): Promise<void> {
  const wallet = NodeWallet.fromSecretKey(payer.secretKey);

  const tx = await postVaaSolana(
    connection,
    wallet.signTransaction,
    CORE_BRIDGE_PID,
    wallet.key(),
    signedMsg
  );
}
