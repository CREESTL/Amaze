const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Token } = require('@uniswap/sdk-core')
const { Pool, Position, nearestUsableTick } = require('@uniswap/v3-sdk')
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

describe("Maze token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        // Deploy core
        let coreFactory = await ethers.getContractFactory("Core");
        let core = await coreFactory.deploy();
        await core.deployed();

        // Deploy token
        let mazeFactory = await ethers.getContractFactory("Maze");
        let maze = await mazeFactory.deploy(
            core.address
        );
        await maze.deployed();

        // Set addresses of all contract into core
        await core.setMaze(maze.address);

        return {
            core,
            maze,
        };
    }

    describe("Deployment", () => {
        it("Should have a correct name", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.name()).to.equal("Maze");
        });

        it("Should have a correct symbol", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.symbol()).to.equal("MAZE");
        });

        it("Should have correct decimals", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.decimals()).to.equal(18);
        });

        it("Should have correct current supply", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.totalSupply()).to.equal(parseEther("100000000"));
        });

        it("Should have correct owner balance", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.balanceOf(ownerAcc.address)).to.equal(parseEther("100000000"));
        });

        it("Should have correct core address", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.core()).to.equal(core.address);
        });

        describe("Fails", () => {
            it("Should fail to deploy with zero core address", async () => {
                let mazeFactory = await ethers.getContractFactory("Maze");
                await expect(mazeFactory.deploy(zeroAddress)).to.be.revertedWith(
                    "Maze: Core cannot have zero address"
                );
            });
        });
    });

    describe("Modifiers", () => {
        describe("Blacklisted", () => {
            it("Should check that user is not blacklisted in transfer", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));
                await maze.connect(ownerAcc).transfer(clientAcc2.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).transfer(clientAcc2.address, parseEther("0.1"));
                await maze.connect(clientAcc2).transfer(clientAcc1.address, parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc2.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).transfer(clientAcc2.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
                await expect(
                    maze.connect(clientAcc2).transfer(clientAcc1.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });

            it("Should check that user is not blacklisted in approve", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).approve(clientAcc2.address, parseEther("0.1"));
                await maze.connect(clientAcc2).approve(clientAcc1.address, parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc1.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).approve(clientAcc2.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
                await expect(
                    maze.connect(clientAcc2).approve(clientAcc1.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });

            it("Should check that user is not blacklisted in burn", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).burn(parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc1.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).burn(parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });
        });

        describe("Paused", () => {
            it("Should reverted if paused by not owner", async () => {
                let { maze, core } = await loadFixture(deploys);

                await expect(maze.connect(clientAcc1).pause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });

            it("Should reverted if unpaused by not owner", async () => {
                let { maze, core } = await loadFixture(deploys);

                await expect(maze.connect(clientAcc1).unpause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });

            it("Should forbid any operations when contract is paused", async () => {
                let { maze, core } = await loadFixture(deploys);

                let burnAmount = parseEther("0.1");

                await maze.connect(ownerAcc).pause();

                await expect(maze.connect(ownerAcc).burn(burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).approve(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).transfer(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).transferFrom(clientAcc1.address, ownerAcc.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).increaseAllowance(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).decreaseAllowance(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );

                await maze.connect(ownerAcc).unpause();

                await maze.connect(ownerAcc).burn(burnAmount);
            });
        });
    });

    describe("Main functions", () => {
        describe("transfer", function () {
            it("when the sender is the zero address", async function () {
                let { maze, core } = await loadFixture(deploys);

                let amount = parseEther("1");

                await expect(maze.transfer(zeroAddress, amount))
                    .to.be.revertedWith("ERC20: transfer to the zero address");
            });

            it("transfer", async () => {
                let { maze, core } = await loadFixture(deploys);

                let amount = parseEther("1");

                await expect(maze.connect(clientAcc1).transfer(clientAcc2.address, amount))
                    .to.be.revertedWith('ERC20: transfer amount exceeds balance');

                await expect(maze.transfer(clientAcc1.address, amount))
                    .to.emit(maze, "Transfer").withArgs(
                        ownerAcc.address,
                        clientAcc1.address,
                        amount
                    );

                expect(await maze.balanceOf(clientAcc1.address)).to.be.equal(amount);
            });
        });

        describe("Approve", () => {
            it("Should approve transfer of tokens to another user", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(0);

                let transferAmount = parseEther("0.1");
                await expect(
                    maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount)
                ).to.emit(maze, "Approval");

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                    transferAmount
                );
            });

            it("Should fail to approve for zero address spender", async () => {
                let { maze, core } = await loadFixture(deploys);

                let transferAmount = parseEther("0.1");
                await expect(
                    maze.connect(ownerAcc).approve(zeroAddress, transferAmount)
                ).to.be.revertedWith("ERC20: approve to the zero address");
            });
        });

        describe("Burn", () => {
            describe("From included accounts", () => {
                it("Should burn tokens of the user", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Transfer some tokens to the client
                    let transferAmount = parseEther("0.2");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                    let startTotalSupply = await maze.totalSupply();

                    let burnAmount = parseEther("0.1");

                    await expect(maze.connect(ownerAcc).burn(burnAmount)).to.emit(maze, "Transfer");

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                    let endTotalSupply = await maze.totalSupply();

                    expect(ownerEndBalance).to.equal(ownerStartBalance.sub(burnAmount));
                    expect(endTotalSupply).to.equal(startTotalSupply.sub(burnAmount));
                    // Client's balance should not change. Burnt tokens are
                    // not distributed
                    expect(clientEndBalance).to.equal(clientStartBalance);
                    // Burnt tokens are not sent to the zero address
                    expect(await maze.balanceOf(zeroAddress)).to.equal(0);
                });
            });
            describe("Fails", () => {
                it("Should fail to burn more tokens that user has", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let burnAmount = parseEther("1000000000000000");

                    await expect(maze.connect(ownerAcc).burn(burnAmount)).to.be.revertedWith(
                        "ERC20: burn amount exceeds balance"
                    );
                });
            });
        });

        describe("TransferFrom", () => {
            it("Should decrease allowance after transfer", async () => {
                let { maze, core } = await loadFixture(deploys);

                let transferAmount = parseEther("1");
                await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                let startAllowance = await maze.allowance(ownerAcc.address, clientAcc1.address);

                let client2StartBalance = await maze.balanceOf(clientAcc2.address);
                await maze
                    .connect(clientAcc1)
                    .transferFrom(ownerAcc.address, clientAcc2.address, transferAmount);
                let client2EndBalance = await maze.balanceOf(clientAcc2.address);
                expect(client2EndBalance).to.equal(client2StartBalance.add(transferAmount));

                let endAllowance = await maze.allowance(ownerAcc.address, clientAcc1.address);
                expect(endAllowance).to.equal(startAllowance.sub(transferAmount));
            });
        });

        describe("Allowance", () => {
            describe("Increase allowance", () => {
                it("Should increase allowance", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("1");

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(0);

                    await maze
                        .connect(ownerAcc)
                        .increaseAllowance(clientAcc1.address, transferAmount);

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                        transferAmount
                    );
                });
            });
            describe("Decrease allowance", () => {
                it("Should decrease allowance", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("1");

                    await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                        transferAmount
                    );

                    await maze
                        .connect(ownerAcc)
                        .decreaseAllowance(clientAcc1.address, transferAmount.div(2));

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                        transferAmount.div(2)
                    );
                });
            });
        });
    });
});
