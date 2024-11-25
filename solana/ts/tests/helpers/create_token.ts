import * as anchor from '@coral-xyz/anchor';

import { Keypair, PublicKey, Signer, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
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
} from '@solana/spl-token';
import { Program, Provider } from '@coral-xyz/anchor';

export async function createTransferFeeConfigToken(provider: Provider, wallet: Signer, decimals: number): Promise<PublicKey> {
  const mint = new Keypair();

  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);

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
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(mint.publicKey, decimals, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
  );

  await sendAndConfirmTransaction(provider.connection, transaction, [wallet, mint], { skipPreflight: true, commitment: 'confirmed' });

  return mint.publicKey;
}

export async function mintTransferHookTokenTo(provider: Provider, wallet: Signer, recipient: PublicKey, mint: PublicKey, amount: number): Promise<String> {
  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint,
    recipient,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      destinationTokenAccount,
      recipient,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createMintToInstruction(mint, destinationTokenAccount, wallet.publicKey, amount, [], TOKEN_2022_PROGRAM_ID),
  );

  const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [wallet], { skipPreflight: true });

  return txSig

}