const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect, assert } = require("chai");

describe("ScalableReward", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
   
   // Contracts are deployed using the first signer/account by default
    const [tokenAddress] = await ethers.getSigners();

    const TKN = await ethers.getContractFactory("TKN");
    const tkn = await TKN.deploy();

    const ScalableReward = await ethers.getContractFactory("ScalableReward");
    const scalableReward = await ScalableReward.deploy(tkn.address);

    return { tkn, scalableReward };
  }

  describe("Deployment", function () {
    it("Check token name", async function () {
      const { tkn, scalableReward } = await loadFixture(deploy);
      expect(await tkn.symbol()).to.equal("TKN");
    });

    it("Transfer tokens", async function () {
      const { tkn, scalableReward } = await loadFixture(deploy);
      const [owner, alice] = await ethers.getSigners();
      await tkn.transfer(alice.address, 20000);
      expect(await tkn.balanceOf(alice.address)).to.equal(20000);
    });

    it("Deposit", async function () {
      const { tkn, scalableReward } = await loadFixture(deploy);
      const [owner, alice] = await ethers.getSigners();
      await tkn.transfer(alice.address, 200);
    
      //insufficient funds case
      await expect(scalableReward.connect(alice).deposit(1000)).to.be.revertedWith("insufficient funds");
      await expect(scalableReward.connect(alice).deposit(100)).to.be.revertedWith("ERC20: insufficient allowance");

      await tkn.connect(alice).approve(scalableReward.address, 10000);

      //successful deposit
      await scalableReward.connect(alice).deposit(100);
      expect(await scalableReward.totalDeposit()).to.equal(100);
       //stake already made
      await expect(scalableReward.connect(alice).deposit(100)).to.be.revertedWith("stake already made");
    });


    it("Withdraw", async function () {
      const { tkn, scalableReward } = await loadFixture(deploy);
      const [owner, alice, bob, charle] = await ethers.getSigners();
      //check contract owner interaction
      await expect(scalableReward.withdraw()).to.be.revertedWith("creater cannot interact");
      
      await tkn.transfer(alice.address, 200);
      originalBal = tkn.balanceOf(alice.address);
      //same stake
      await tkn.transfer(bob.address, 200);

      await tkn.connect(alice).approve(scalableReward.address, 100000);
      await tkn.connect(bob).approve(scalableReward.address, 100000);
      await tkn.connect(charle).approve(scalableReward.address, 100000);

      //and same t1
      await scalableReward.connect(alice).deposit(200);
      await scalableReward.connect(bob).deposit(200);

      //check deposit after increasing
      expect(await scalableReward.getDepositAmount(alice.address)).to.equal(200);

      await tkn.transfer(owner.address, 10000);
      await tkn.connect(owner).approve(scalableReward.address, 10000);
      scalableReward.distribute(200);

      await tkn.transfer(charle.address, 200);
      //charle made stake after first distribute
      await scalableReward.connect(charle).deposit(200);

      scalableReward.distribute(200);

      await scalableReward.connect(alice).withdraw();
      await scalableReward.connect(bob).withdraw();

      //check deposit after withdraw
      expect(await scalableReward.getDepositAmount(alice.address)).to.equal(0);

      //check user new balance > original balance after withdraw
      newBalance = await tkn.balanceOf(alice.address)
      expect(newBalance).to.be.greaterThan(200);

     // rewards are equal
      expect(await tkn.balanceOf(alice.address)).to.equal(await tkn.balanceOf(bob.address));

      await scalableReward.connect(charle).withdraw();
      expect(await tkn.balanceOf(alice.address)).to.be.greaterThan(await tkn.balanceOf(charle.address));

      //try to withdraw again
      await expect(scalableReward.connect(alice).withdraw()).to.be.revertedWith("amount should be > 0");
    });

    it("Distribute", async function () {
      const { tkn, scalableReward } = await loadFixture(deploy);
      const [owner, eve] = await ethers.getSigners();

      initalReward = await scalableReward.getRewardBankBalance();
      //check inital reward
      expect(initalReward).to.equal(0);

      await tkn.transfer(eve.address, 200);
      await tkn.connect(eve).approve(scalableReward.address, 10000);
      //user try to increase reward
      await expect(scalableReward.connect(eve).distribute(100)).to.be.revertedWith("only creator can distribute funds");

      await tkn.transfer(owner.address, 200);
      await tkn.approve(scalableReward.address, 10000);
      
      //is it possible to increase the reward to the first stake
      await expect(scalableReward.distribute(200)).to.be.revertedWith("total deposit = 0");

      await scalableReward.connect(eve).deposit(100);
      await scalableReward.distribute(200);
      //reward bank now > 0
      expect(await scalableReward.getRewardBankBalance()).to.be.greaterThan(0);
    });

  });
});
