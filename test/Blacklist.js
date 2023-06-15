const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

describe("Blacklist token", () => {
  // Deploy all contracts before each test suite
  async function deploys() {
    [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

    // Deploy blacklist
    let blacklistFactory = await ethers.getContractFactory("Blacklist");
    let blacklist = await blacklistFactory.deploy();
    await blacklist.deployed();

    return {
      blacklist,
    };
  }

  describe("Modifiers", () => {
    it("Forbid operations when contract is paused", async () => {
      let { blacklist } = await loadFixture(deploys);

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

      await blacklist.connect(ownerAcc).pause();

      await expect(
        blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address)
      ).to.be.revertedWith("Pausable: paused");

      await blacklist.connect(ownerAcc).unpause();

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc2.address);
    });
    it("Allow check blacklisted when contract is paused", async () => {
      let { blacklist } = await loadFixture(deploys);

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

      await blacklist.connect(ownerAcc).pause();

      expect(
        await blacklist.connect(ownerAcc).checkBlacklisted(clientAcc1.address)
      ).to.equal(true);
    });
  });

  describe("Getters", () => {
    it("Should check that user is in blacklist", async () => {
      let { blacklist } = await loadFixture(deploys);

      await expect(
        await blacklist.checkBlacklisted(clientAcc1.address)
      ).to.equal(false);

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

      await expect(
        await blacklist.checkBlacklisted(clientAcc1.address)
      ).to.equal(true);
    });
  });

  describe("Main functions", () => {
    describe("Add to blacklist", () => {
      it("Should add users to blacklist", async () => {
        let { blacklist } = await loadFixture(deploys);

        await expect(
          await blacklist.checkBlacklisted(clientAcc1.address)
        ).to.equal(false);

        await expect(
          blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address)
        ).to.emit(blacklist, "AddToBlacklist");

        await expect(
          await blacklist.checkBlacklisted(clientAcc1.address)
        ).to.equal(true);
      });
      describe("Fails", () => {
        it("Should fail to blacklist already blacklisted account", async () => {
          let { blacklist } = await loadFixture(deploys);

          await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

          await expect(
            blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address)
          ).to.be.revertedWith("Blacklist: Account already in blacklist");
        });
        it("Should fail if user blacklists himself", async () => {
          let { blacklist } = await loadFixture(deploys);

          await expect(
            blacklist.connect(ownerAcc).addToBlacklist(ownerAcc.address)
          ).to.be.revertedWith("Blacklist: Cannot blacklist yourself");
        });
      });
    });

    describe("Remove from blacklist", () => {
      describe("Fails", () => {
        it("Should fail to remove not blacklisted account", async () => {
          let { blacklist } = await loadFixture(deploys);

          await expect(
            blacklist.connect(ownerAcc).removeFromBlacklist(clientAcc1.address)
          ).to.be.revertedWith("Blacklist: Account not in blacklist");
        });
      });
    });
  });
});
