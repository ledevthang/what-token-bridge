import {expect} from "chai";
import {ethers} from "ethers";
import {
  CHAIN_ID_AVAX,
  CHAIN_ID_ETH,
  ChainId,
  tryNativeToHexString,
} from "@certusone/wormhole-sdk";
import {MockGuardians} from "@certusone/wormhole-sdk/lib/cjs/mock";
import {
  FORK_AVAX_CHAIN_ID,
  FORK_ETH_CHAIN_ID,
  GUARDIAN_PRIVATE_KEY,
  AVAX_HOST,
  AVAX_WORMHOLE_ADDRESS,
  AVAX_BRIDGE_ADDRESS,
  AVAX_WORMHOLE_CHAIN_ID,
  AVAX_WORMHOLE_GUARDIAN_SET_INDEX,
  AVAX_WORMHOLE_MESSAGE_FEE,
  ETH_HOST,
  ETH_WORMHOLE_ADDRESS,
  ETH_BRIDGE_ADDRESS,
  ETH_WORMHOLE_CHAIN_ID,
  ETH_WORMHOLE_GUARDIAN_SET_INDEX,
  ETH_WORMHOLE_MESSAGE_FEE,
  WALLET_PRIVATE_KEY,
} from "./helpers/consts";
import {
  formatWormholeMessageFromReceipt,
  readWormUSDContractAddress,
} from "./helpers/utils";
import {IWormhole__factory, IERC20__factory} from "../ethers-contracts";
import {ITokenBridge__factory} from "@certusone/wormhole-sdk/lib/cjs/ethers-contracts";

describe("Environment Test", () => {
  // avax wallet
  const avaxProvider = new ethers.providers.StaticJsonRpcProvider(AVAX_HOST);
  const avaxWallet = new ethers.Wallet(WALLET_PRIVATE_KEY, avaxProvider);

  // eth wallet
  const ethProvider = new ethers.providers.StaticJsonRpcProvider(ETH_HOST);
  const ethWallet = new ethers.Wallet(WALLET_PRIVATE_KEY, ethProvider);

  // wormhole contract
  const avaxWormhole = IWormhole__factory.connect(
    AVAX_WORMHOLE_ADDRESS,
    avaxWallet
  );
  const ethWormhole = IWormhole__factory.connect(
    ETH_WORMHOLE_ADDRESS,
    ethWallet
  );

  describe("Verify Mainnet Forks", () => {
    it("AVAX Chain ID", async () => {
      const network = await avaxProvider.getNetwork();
      expect(network.chainId).to.equal(FORK_AVAX_CHAIN_ID);
    });

    it("ETH Chain ID", async () => {
      const network = await ethProvider.getNetwork();
      expect(network.chainId).to.equal(FORK_ETH_CHAIN_ID);
    });
  });

  describe("Verify AVAX Wormhole Contract", () => {
    it("Chain ID", async () => {
      const chainId = await avaxWormhole.chainId();
      expect(chainId).to.equal(AVAX_WORMHOLE_CHAIN_ID);
    });

    it("Message Fee", async () => {
      const messageFee: ethers.BigNumber = await avaxWormhole.messageFee();
      expect(messageFee.eq(AVAX_WORMHOLE_MESSAGE_FEE)).to.be.true;
    });

    it("Guardian Set", async () => {
      // Check guardian set index
      const guardianSetIndex = await avaxWormhole.getCurrentGuardianSetIndex();
      expect(guardianSetIndex).to.equal(AVAX_WORMHOLE_GUARDIAN_SET_INDEX);

      // Override guardian set
      const abiCoder = ethers.utils.defaultAbiCoder;

      // Get slot for Guardian Set at the current index
      const guardianSetSlot = ethers.utils.keccak256(
        abiCoder.encode(["uint32", "uint256"], [guardianSetIndex, 2])
      );

      const numGuardians = await avaxProvider
        .getStorageAt(AVAX_WORMHOLE_ADDRESS, guardianSetSlot)
        .then((value) => ethers.BigNumber.from(value).toBigInt());
      for (let i = 1; i < numGuardians; ++i) {
        await avaxProvider.send("anvil_setStorageAt", [
          AVAX_WORMHOLE_ADDRESS,
          abiCoder.encode(
            ["uint256"],
            [
              ethers.BigNumber.from(
                ethers.utils.keccak256(guardianSetSlot)
              ).add(i),
            ]
          ),
          ethers.utils.hexZeroPad("0x0", 32),
        ]);
      }

      // Now overwrite the first guardian key with the devnet key specified
      // in the function argument.
      const devnetGuardian = new ethers.Wallet(GUARDIAN_PRIVATE_KEY).address;
      await avaxProvider.send("anvil_setStorageAt", [
        AVAX_WORMHOLE_ADDRESS,
        abiCoder.encode(
          ["uint256"],
          [
            ethers.BigNumber.from(ethers.utils.keccak256(guardianSetSlot)).add(
              0 // just explicit w/ index 0
            ),
          ]
        ),
        ethers.utils.hexZeroPad(devnetGuardian, 32),
      ]);

      // Change the length to 1 guardian
      await avaxProvider.send("anvil_setStorageAt", [
        AVAX_WORMHOLE_ADDRESS,
        guardianSetSlot,
        ethers.utils.hexZeroPad("0x1", 32),
      ]);

      // Confirm guardian set override
      const guardians = await avaxWormhole
        .getGuardianSet(guardianSetIndex)
        .then(
          (guardianSet: any) => guardianSet[0] // first element is array of keys
        );
      expect(guardians.length).to.equal(1);
      expect(guardians[0]).to.equal(devnetGuardian);
    });
  });

  describe("Verify ETH Wormhole Contract", () => {
    it("Chain ID", async () => {
      const chainId = await ethWormhole.chainId();
      expect(chainId).to.equal(ETH_WORMHOLE_CHAIN_ID);
    });

    it("Message Fee", async () => {
      const messageFee: ethers.BigNumber = await ethWormhole.messageFee();
      expect(messageFee.eq(ETH_WORMHOLE_MESSAGE_FEE)).to.be.true;
    });

    it("Guardian Set", async () => {
      // Check guardian set index
      const guardianSetIndex = await ethWormhole.getCurrentGuardianSetIndex();
      expect(guardianSetIndex).to.equal(ETH_WORMHOLE_GUARDIAN_SET_INDEX);

      // Override guardian set
      const abiCoder = ethers.utils.defaultAbiCoder;

      // Get slot for Guardian Set at the current index
      const guardianSetSlot = ethers.utils.keccak256(
        abiCoder.encode(["uint32", "uint256"], [guardianSetIndex, 2])
      );

      // Overwrite all but first guardian set to zero address. This isn't
      // necessary, but just in case we inadvertently access these slots
      // for any reason.
      const numGuardians = await ethProvider
        .getStorageAt(ETH_WORMHOLE_ADDRESS, guardianSetSlot)
        .then((value) => ethers.BigNumber.from(value).toBigInt());
      for (let i = 1; i < numGuardians; ++i) {
        await ethProvider.send("anvil_setStorageAt", [
          ETH_WORMHOLE_ADDRESS,
          abiCoder.encode(
            ["uint256"],
            [
              ethers.BigNumber.from(
                ethers.utils.keccak256(guardianSetSlot)
              ).add(i),
            ]
          ),
          ethers.utils.hexZeroPad("0x0", 32),
        ]);
      }

      // Now overwrite the first guardian key with the devnet key specified
      // in the function argument.
      const devnetGuardian = new ethers.Wallet(GUARDIAN_PRIVATE_KEY).address;
      await ethProvider.send("anvil_setStorageAt", [
        ETH_WORMHOLE_ADDRESS,
        abiCoder.encode(
          ["uint256"],
          [
            ethers.BigNumber.from(ethers.utils.keccak256(guardianSetSlot)).add(
              0 // just explicit w/ index 0
            ),
          ]
        ),
        ethers.utils.hexZeroPad(devnetGuardian, 32),
      ]);

      // Change the length to 1 guardian
      await ethProvider.send("anvil_setStorageAt", [
        ETH_WORMHOLE_ADDRESS,
        guardianSetSlot,
        ethers.utils.hexZeroPad("0x1", 32),
      ]);

      // Confirm guardian set override
      const guardians = await ethWormhole.getGuardianSet(guardianSetIndex).then(
        (guardianSet: any) => guardianSet[0] // first element is array of keys
      );
      expect(guardians.length).to.equal(1);
      expect(guardians[0]).to.equal(devnetGuardian);
    });
  });


  describe("Check wormhole-sdk", () => {
    it("tryNativeToHexString", async () => {
      const accounts = await avaxProvider.listAccounts();
      expect(tryNativeToHexString(accounts[0], "ethereum")).to.equal(
        "00000000000000000000000090f8bf6a479f320ead074411a4b0e7944ea8c9c1"
      );
    });
  });
});
