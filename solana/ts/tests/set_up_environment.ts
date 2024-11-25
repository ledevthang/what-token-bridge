import { expect, use as chaiUse } from "chai";
import chaiAsPromised from 'chai-as-promised';
chaiUse(chaiAsPromised);
import { Connection, Keypair } from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  tryNativeToHexString,
} from "@certusone/wormhole-sdk";
import * as wormhole from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import * as mock from "@certusone/wormhole-sdk/lib/cjs/mock";
import {
  GOVERNANCE_EMITTER_ADDRESS,
  MOCK_GUARDIANS,
  LOCALHOST,
  MINTS_WITH_DECIMALS,
  PAYER_KEYPAIR,
  CORE_BRIDGE_PID,
  RELAYER_KEYPAIR,
  boilerPlateReduction,
} from "./helpers";

describe(" 0: Wormhole", () => {
  const connection = new Connection(LOCALHOST, "processed");
  const payer = PAYER_KEYPAIR;
  const relayer = RELAYER_KEYPAIR;

  const defaultMintAmount = 10n ** 6n;

  const {
    requestAirdrop,
    expectIxToSucceed,
  } = boilerPlateReduction(connection, payer);

  before("Airdrop", async function() {
    await Promise.all([payer, relayer].map(kp => kp.publicKey).map(requestAirdrop));
  });

  describe("Verify Local Validator", function() {
    it("Create SPL Tokens", async function() {
      await Promise.all(
        Array.from(MINTS_WITH_DECIMALS.entries()).map(
          async ([mintDecimals, {privateKey, publicKey}]) => {
            const mint = await createMint(
              connection,
              payer,
              payer.publicKey,
              null, // freezeAuthority
              mintDecimals,
              Keypair.fromSecretKey(privateKey)
            );
            expect(mint).deep.equals(publicKey);

            const {decimals} = await getMint(connection, mint);
            expect(decimals).equals(mintDecimals);
          }
        )
      );
    });

    it("Create ATAs", async function() {
      await Promise.all(
        Array.from(MINTS_WITH_DECIMALS.values()).flatMap(({publicKey: mint}) => 
          [payer, relayer].map(wallet =>
            expect(
              getOrCreateAssociatedTokenAccount(connection, wallet, mint, wallet.publicKey)
            ).to.be.fulfilled
          )
        )
      );
    });

    it("Mint to Wallet's ATAs", async function() {
      await Promise.all(
        Array.from(MINTS_WITH_DECIMALS.entries()).map(
          async ([mintDecimals, {publicKey: mint}]) => {
            const mintAmount = defaultMintAmount * 10n ** BigInt(mintDecimals);
            const destination = getAssociatedTokenAddressSync(mint, payer.publicKey);

            await expect(
              mintTo(connection, payer, mint, destination, payer, mintAmount)
            ).to.be.fulfilled;

            const {amount} = await getAccount(connection, destination);
            expect(amount).equals(mintAmount);
          }
        )
      );
    });
  });

  describe("Verify Wormhole Program", function() {
    it("Initialize", async function() {
      const guardianSetExpirationTime = 86400;
      const fee = 100n;
      const devnetGuardian = MOCK_GUARDIANS.getPublicKeys()[0];
      const initialGuardians = [devnetGuardian];

      await expectIxToSucceed(
        wormhole.createInitializeInstruction(
          CORE_BRIDGE_PID,
          payer.publicKey,
          guardianSetExpirationTime,
          fee,
          initialGuardians
        )
      );

      const accounts = await connection.getProgramAccounts(CORE_BRIDGE_PID);
      expect(accounts).has.length(2);

      const info = await wormhole.getWormholeBridgeData(connection, CORE_BRIDGE_PID);
      expect(info.guardianSetIndex).equals(0);
      expect(info.config.guardianSetExpirationTime).equals(guardianSetExpirationTime);
      expect(info.config.fee).equals(fee);

      const guardianSet =
        await wormhole.getGuardianSet(connection, CORE_BRIDGE_PID, info.guardianSetIndex);
      expect(guardianSet.index).equals(0);
      expect(guardianSet.keys).has.length(1);
      expect(devnetGuardian).deep.equal(guardianSet.keys[0]);
    });
  });

  describe("Check wormhole-sdk", function() {
    it("tryNativeToHexString", async function() {
      expect(tryNativeToHexString(payer.publicKey.toString(), "solana")).equals(
        "c291b257b963a479bbc5a56aa6525494a6d708e628ff2ad61c8679c99d2afca5"
      );
    });
  });
});
