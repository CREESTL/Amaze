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

    // Deploy token
    let mazeFactory = await ethers.getContractFactory("Maze");
    let maze = await mazeFactory.deploy(blacklist.address);
    await maze.deployed();

    // Deploy farming
    let farmingFactory = await ethers.getContractFactory("Farming");
    let farming = await farmingFactory.deploy(blacklist.address);
    await farming.deployed();

    // Deploy vesting
    let vestingFactory = await ethers.getContractFactory("Vesting");
    let vesting = await vestingFactory.deploy(blacklist.address);
    await vesting.deployed();

    // Exlude contracts from stakers
    await maze.excludeFromStakers(farming.address);
    await maze.excludeFromStakers(vesting.address);
    // Contracts do not pay fees
    await maze.addToWhitelist(farming.address);
    await maze.addToWhitelist(vesting.address);

    // Set addresses of all contract into blacklist
    await blacklist.setMaze(maze.address);
    await blacklist.setFarming(farming.address);
    await blacklist.setVesting(vesting.address);

    return {
      blacklist,
      maze,
      farming,
      vesting,
    };
  }

  describe("Modifiers", () => {
    it("Forbid operations when contract is paused", async () => {
      let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

      await blacklist.connect(ownerAcc).pause();

      await expect(
        blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address)
      ).to.be.revertedWith("Pausable: paused");

      await blacklist.connect(ownerAcc).unpause();

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc2.address);
    });
    it("Allow check blacklisted when contract is paused", async () => {
      let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

      await blacklist.connect(ownerAcc).pause();

      expect(
        await blacklist.connect(ownerAcc).checkBlacklisted(clientAcc1.address)
      ).to.equal(true);
    });
  });

  describe("Getters", () => {
    it("Should check that user is in blacklist", async () => {
      let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

      await expect(
        await blacklist.checkBlacklisted(clientAcc1.address)
      ).to.equal(false);

      await blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address);

      await expect(
        await blacklist.checkBlacklisted(clientAcc1.address)
      ).to.equal(true);
    });
  });

  describe("Setters", () => {
    it("Set a new Maze address", async () => {
      let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

      let startMazeAddress = await blacklist.maze();

      await expect(blacklist.setMaze(clientAcc1.address)).to.emit(
        blacklist,
        "MazeChanged"
      );

      let endMazeAddress = await blacklist.maze();

      expect(startMazeAddress).not.to.equal(endMazeAddress);
      expect(endMazeAddress).to.equal(clientAcc1.address);
    });
    it("Set a new Vesting address", async () => {
      let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

      let startVestingAddress = await blacklist.vesting();

      await expect(blacklist.setVesting(clientAcc1.address)).to.emit(
        blacklist,
        "VestingChanged"
      );

      let endVestingAddress = await blacklist.vesting();

      expect(startVestingAddress).not.to.equal(endVestingAddress);
      expect(endVestingAddress).to.equal(clientAcc1.address);
    });
    it("Set a new Farming address", async () => {
      let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

      let startFarmingAddress = await blacklist.farming();

      await expect(blacklist.setFarming(clientAcc1.address)).to.emit(
        blacklist,
        "FarmingChanged"
      );

      let endFarmingAddress = await blacklist.farming();

      expect(startFarmingAddress).not.to.equal(endFarmingAddress);
      expect(endFarmingAddress).to.equal(clientAcc1.address);
    });

    describe("Fails", () => {
      it("Should fail to set zero address Maze", async () => {
        let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

        await expect(blacklist.setMaze(zeroAddress)).to.be.revertedWith(
          "Blacklist: Maze cannot have zero address"
        );
      });
      it("Should fail to set zero address Vesting", async () => {
        let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

        await expect(blacklist.setVesting(zeroAddress)).to.be.revertedWith(
          "Blacklist: Vesting cannot have zero address"
        );
      });
      it("Should fail to set zero address Farming", async () => {
        let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

        await expect(blacklist.setFarming(zeroAddress)).to.be.revertedWith(
          "Blacklist: Farming cannot have zero address"
        );
      });
    });
  });

  describe("Main functions", () => {
    describe("Add to blacklist", () => {
      it("Should add users to blacklist", async () => {
        let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

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
          let { blacklist, maze, farming, vesting } = await loadFixture(
            deploys
          );

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
      it("Should remove users from the blacklist", async () => {
        let { blacklist, maze, farming, vesting } = await loadFixture(deploys);

        await expect(
          blacklist.connect(ownerAcc).addToBlacklist(clientAcc1.address)
        ).to.emit(blacklist, "AddToBlacklist");

        await expect(
          blacklist.connect(ownerAcc).removeFromBlacklist(clientAcc1.address)
        ).to.emit(blacklist, "RemoveFromBlacklist");

        await expect(
          await blacklist.checkBlacklisted(clientAcc1.address)
        ).to.equal(false);
      });
      describe("Fails", () => {
        it("Should fail to remove not blacklisted account", async () => {
          let { blacklist, maze, farming, vesting } = await loadFixture(
            deploys
          );

          await expect(
            blacklist.connect(ownerAcc).removeFromBlacklist(clientAcc1.address)
          ).to.be.revertedWith("Blacklist: Account not in blacklist");
        });
      });
    });
  });
});
