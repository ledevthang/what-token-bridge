import {
  Connection,
  PublicKeyInitData,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { BN, IdlAccounts, Program } from "@coral-xyz/anchor";
import {
  ChainId,
  CONTRACTS,
  isBytes,
  ParsedVaa,
  parseVaa,
  SignedVaa,
} from "@certusone/wormhole-sdk";

import { ethers } from "ethers";

import { WhatTokenBridge as WhatTokenBridgeTypes } from "../../target/types/what_token_bridge";
import IDL from "../../target/idl/what_token_bridge.json";
import {
  deriveAddress,
  getPostMessageCpiAccounts,
} from "@certusone/wormhole-sdk/lib/cjs/solana";
import { deriveEmitterSequenceKey } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole/accounts/sequence";
import { derivePostedVaaKey } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";

import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

const SEED_PREFIX_MESSAGE = Buffer.from("message", "utf-8");
const SEED_PREFIX_SEQUENCE = Buffer.from("sequence", "utf-8");
const SEED_PREFIX_CONFIG = Buffer.from("config", "utf-8");
const SEED_EMITTER_SEQUENCE = Buffer.from("emitter", "utf-8");

export type ConfigData = IdlAccounts<WhatTokenBridgeTypes>["configAccount"];
export interface ForeignEmitter {
  chain: ChainId;
  address: Buffer;
}

export class WhatTokenBridge {
  readonly wormholeId: PublicKey;
  readonly whatMint: PublicKey;
  private readonly program: Program<WhatTokenBridgeTypes>;

  constructor(
    connection: Connection,
    whatMint: PublicKeyInitData,
    wormholeId?: PublicKeyInitData
  ) {
    this.program = new Program<WhatTokenBridgeTypes>(IDL as any, {
      connection,
    });

    this.wormholeId = new PublicKey(
      wormholeId ?? CONTRACTS["TESTNET"].solana.core
    );

    this.whatMint = new PublicKey(whatMint);
  }

  get configPDA(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [SEED_PREFIX_CONFIG],
      this.program.programId
    )[0];
  }

  wormholeMessagePDA(sequence: BN): PublicKey {
    return PublicKey.findProgramAddressSync(
      [SEED_PREFIX_MESSAGE, sequence.toBuffer("le", 8)],
      this.program.programId
    )[0];
  }

  get wormholeSequencePDA(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [SEED_PREFIX_SEQUENCE],
      this.program.programId
    )[0];
  }

  get wormholeEmitterPDA(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [SEED_EMITTER_SEQUENCE],
      this.program.programId
    )[0];
  }

  get getVaultTokenAccount(): PublicKey {
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      this.whatMint,
      this.configPDA,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_PROGRAM_ID
    );
    return vaultTokenAccount;
  }

  public async getConfigData(): Promise<ConfigData> {
    const configPDA = this.configPDA;
    const configData = await this.program.account.configAccount.fetch(
      configPDA
    );
    return configData;
  }

  public async getForeignEmitterData(chain: ChainId): Promise<ForeignEmitter> {
    const emitterPubkey = this.deriveForeignEmitterKey(
      this.program.programId,
      chain
    );

    const { address } = await this.program.account.foreignEmitter.fetch(
      emitterPubkey
    );

    return {
      chain,
      address: Buffer.from(address),
    };
  }

  public deriveReceivedKey(
    programId: PublicKeyInitData,
    chain: ChainId,
    sequence: bigint,
    emitterAddress: Buffer
  ) {
    return deriveAddress(
      [
        Buffer.from("received"),
        (() => {
          const buf = Buffer.alloc(10);
          buf.writeUInt16LE(chain, 0);
          buf.writeBigInt64LE(sequence, 2);
          return buf;
        })(),
        emitterAddress,
      ],
      programId
    );
  }

  public deriveForeignEmitterKey(programId: PublicKeyInitData, chain: ChainId) {
    return deriveAddress(
      [
        Buffer.from("foreign_emitter"),
        (() => {
          const buf = Buffer.alloc(2);
          buf.writeUInt16LE(chain);
          return buf;
        })(),
      ],
      programId
    );
  }

  public async initialize(
    owner: PublicKey,
    fee: number,
    whatMint: PublicKey
  ): Promise<Transaction> {
    const initFee = new BN(fee);
    const tx = await this.program.methods
      .initialize(initFee)
      .accountsPartial({
        owner: owner,
        configAccount: this.configPDA,
        whatMint: whatMint,
      })
      .transaction();
    return tx;
  }

  public async updateConfig(
    owner: PublicKey,
    newFee: BN | null,
    whitelistEnabled: boolean | null
  ): Promise<Transaction> {
    const tx = await this.program.methods
      .updateConfig({
        newFee,
        whitelistEnabled,
      })
      .accountsPartial({
        owner: owner,
        configAccount: this.configPDA,
      })
      .transaction();

    return tx;
  }

  public async transferOwnership(
    owner: PublicKey,
    newOwnerCandidate: PublicKey
  ): Promise<Transaction> {
    const tx = await this.program.methods
      .transferOwnership(newOwnerCandidate)
      .accountsPartial({
        owner: owner,
        configAccount: this.configPDA,
      })
      .transaction();

    return tx;
  }

  public async confirmOwnershipTransfer(
    ownerCandidate: PublicKey
  ): Promise<Transaction> {
    const tx = await this.program.methods
      .confirmOwnershipTransfer()
      .accountsPartial({
        ownerCandidate: ownerCandidate,
        configAccount: this.configPDA,
      })
      .transaction();

    return tx;
  }

  public async addWhitelist(
    owner: PublicKey,
    whitelists: PublicKey[]
  ): Promise<Transaction> {
    const tx = await this.program.methods
      .addWhitelists(whitelists)
      .accountsPartial({
        owner: owner,
        configAccount: this.configPDA,
      })
      .transaction();
    return tx;
  }

  public async removeWhitelist(
    owner: PublicKey,
    whitelists: PublicKey[]
  ): Promise<Transaction> {
    const tx = await this.program.methods
      .removeWhitelists(whitelists)
      .accountsPartial({
        owner: owner,
        configAccount: this.configPDA,
      })
      .transaction();
    return tx;
  }

  public async registerEmitter(
    owner: PublicKey,
    chainId: ChainId,
    foreignEmitterAddress: Buffer
  ): Promise<Transaction> {
    const foreignEmitter = this.deriveForeignEmitterKey(
      this.program.programId,
      chainId
    );

    const tx = await this.program.methods
      .registerEmitter(chainId, [...foreignEmitterAddress])
      .accountsPartial({
        owner: owner,
        configAccount: this.configPDA,
        foreignEmitter: foreignEmitter,
      })
      .transaction();
    return tx;
  }

  public async lockAndSend(
    user: PublicKey,
    amount: number,
    recipientAddress: string
  ): Promise<Transaction> {

    const configData = await this.getConfigData();

    const wormholeMessage = this.wormholeMessagePDA(
      configData.sequence.add(new BN(1))
    );

    const evmRecipientArrayified = Array.from(
      ethers.utils.zeroPad(recipientAddress, 32)
    );

    const wormholeCpiAccounts = () => {
      const unused = PublicKey.default;
      const {
        wormholeBridge,
        wormholeFeeCollector,
        rent,
        clock,
        systemProgram,
      } = getPostMessageCpiAccounts(
        this.program.programId,
        this.wormholeId,
        unused,
        unused
      );

      return {
        wormholeBridge,
        wormholeFeeCollector,
        wormholeSequence: deriveEmitterSequenceKey(
          this.configPDA,
          this.wormholeId
        ),
        wormholeMessage: wormholeMessage,
        wormholeProgram: this.wormholeId,
        rent,
        clock,
        systemProgram,
      };
    };
    const userTokenAccount = getAssociatedTokenAddressSync(
      this.whatMint,
      user,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_PROGRAM_ID
    );

    const tx = await this.program.methods
      .lockAndSend(new BN(amount), evmRecipientArrayified)
      .accountsPartial({
        user: user,
        configAccount: this.configPDA,
        whatMint: this.whatMint,
        vaultTokenAccount: this.getVaultTokenAccount,
        userTokenAccount: userTokenAccount,
        token2022Program: TOKEN_2022_PROGRAM_ID,
        ...wormholeCpiAccounts(),
      })
      .transaction();
    return tx;
  }

  public async redeemAndUnlock(
    recipient: PublicKey,
    wormholeMessage: SignedVaa | ParsedVaa
  ): Promise<Transaction> {
    const parsed = isBytes(wormholeMessage)
      ? parseVaa(wormholeMessage)
      : wormholeMessage;

    const recipientTokenAccount = getAssociatedTokenAddressSync(
      this.whatMint,
      recipient,
      true,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_PROGRAM_ID
    );

    const tx = await this.program.methods
      .redeemAndUnlock([...parsed.hash])
      .accountsPartial({
        payer: recipient,
        recipient: recipient,
        configAccount: this.configPDA,
        whatMint: this.whatMint,
        posted: derivePostedVaaKey(this.wormholeId, parsed.hash),
        vaultTokenAccount: this.getVaultTokenAccount,
        recipientTokenAccount: recipientTokenAccount,
        wormholeProgram: this.wormholeId,
        received: this.deriveReceivedKey(
          this.program.programId,
          parsed.emitterChain as ChainId,
          parsed.sequence,
          parsed.emitterAddress
        ),
        foreignEmitter: this.deriveForeignEmitterKey(
          this.program.programId,
          parsed.emitterChain as ChainId
        ),
      })
      .transaction();

    return tx;
  }
}
