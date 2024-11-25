import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
} from "@solana/spl-token";
import {
  NodeWallet,
  postVaaSolana,
} from "@certusone/wormhole-sdk/lib/cjs/solana";

export async function createTransferFeeConfigToken(
  connection: Connection,
  wallet: Keypair,
  decimals: number
): Promise<PublicKey> {
  const mint = new Keypair();

  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mint.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      0,
      BigInt(0),
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      wallet.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );

  await sendAndConfirmTransaction(connection, transaction, [wallet, mint], {
    skipPreflight: true,
    commitment: "confirmed",
  });

  return mint.publicKey;
}

export async function mintTransferHookTokenTo(
  connection: Connection,
  wallet: Keypair,
  recipient: PublicKey,
  mint: PublicKey,
  amount: number
): Promise<String> {
  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint,
    recipient,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      destinationTokenAccount,
      recipient,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createMintToInstruction(
      mint,
      destinationTokenAccount,
      wallet.publicKey,
      amount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  const txSig = await sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet],
    { skipPreflight: true }
  );

  return txSig;
}

export async function postSignedMsgAsVaaOnSolana(
  connection: Connection,
  signedMsg: Buffer,
  payer: Signer,
  wormholeBridge: PublicKey
): Promise<void> {
  const wallet = NodeWallet.fromSecretKey(payer.secretKey);

  const tx = await postVaaSolana(
    connection,
    wallet.signTransaction,
    wormholeBridge,
    wallet.key(),
    signedMsg
  );
  console.log(
    `Post VAA at tx: https://explorer.solana.com/tx/${tx[0].signature}?cluster=devnet`
  );
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
