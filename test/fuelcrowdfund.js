var FuelCrowdfund = artifacts.require("./FuelCrowdfund.sol");
var FuelToken = artifacts.require("./FuelToken.sol");
var BigNumber = require('bignumber.js');
require('babel-polyfill');

contract('FuelCrowdfund', function(accounts) {

  function fromBigNumberWeiToEth(bigNum) {
    return bigNum.dividedBy(new BigNumber(10).pow(18)).toNumber();
  }

  async function addSeconds(seconds) {
    return web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [seconds], id: 0});
  }

  async function getTimestampOfCurrentBlock() {
    return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
  }

  const vanbexAddress = accounts[0];
  const testAddress = accounts[2];
  const vanbexTeamAccount = accounts[1];
  const buyerAddress = accounts[3];
  const gasAmount = 4612386;
  const proxyBuyer = accounts[4];
  const endBuyer = accounts[5]


  it("function(): it accepts 1 ether and buys correct fuel at relevant times of ICO", async () =>  {

    const token = await FuelToken.new({from: vanbexAddress, gas: gasAmount});

    const crowdfund = await FuelCrowdfund.new(token.address, {from: vanbexAddress, gas: gasAmount})
    await token.setCrowdfundAddress(crowdfund.address, {from: vanbexAddress, gas: gasAmount});

    const startsAt = await crowdfund.startsAt.call();
    const currentBlockTimestamp = await getTimestampOfCurrentBlock();
    
    await addSeconds(startsAt - currentBlockTimestamp);

    await web3.eth.sendTransaction({from: buyerAddress, to: crowdfund.address, gas: gasAmount, value: web3.toWei("1", "Ether")}); // send in 1
    const firstBalance = await token.balanceOf.call(buyerAddress, {from: buyerAddress, gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(firstBalance), 3000, "The balance of the buyer was not incremented by 3000 FUEL");

    await crowdfund.buyTokens(endBuyer, {from: proxyBuyer, gas: gasAmount, value: web3.toWei("1", "Ether")}); // send in 1
    const endBuyerBalance = await token.balanceOf.call(endBuyer, {from: buyerAddress, gas: gasAmount});
    const proxyBuyerBalance = await token.balanceOf.call(proxyBuyer, {from: buyerAddress, gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(endBuyerBalance), 3000, "The balance of the end buyer was not incremented by 3000 FUEL");
    assert.equal(fromBigNumberWeiToEth(proxyBuyerBalance), 0, "The balance of the proxy is not 0");
  
  
    // advance time
    const oneWeekInSeconds = 604800;
    await addSeconds(oneWeekInSeconds);
    await web3.eth.sendTransaction({from: buyerAddress, to: crowdfund.address, gas: gasAmount, value: web3.toWei("1", "Ether")}); // send in 1
    const secondBalance = await token.balanceOf.call(buyerAddress, {from: buyerAddress, gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(secondBalance) - fromBigNumberWeiToEth(firstBalance), 2250, "The balance of the buyer was not incremented by 2250 FUEL");

    // advance time
    await addSeconds(oneWeekInSeconds);
    await web3.eth.sendTransaction({from: buyerAddress, to: crowdfund.address, gas: gasAmount, value: web3.toWei("1", "Ether")}); // send in 1
    const thirdBalance = await token.balanceOf.call(buyerAddress, {from: buyerAddress, gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(thirdBalance) - fromBigNumberWeiToEth(secondBalance) , 1700, "The balance of the buyer was not incremented by 1700 FUEL");

    // advance time
    await addSeconds(oneWeekInSeconds);
    await web3.eth.sendTransaction({from: buyerAddress, to: crowdfund.address, gas: gasAmount, value: web3.toWei("1", "Ether")}); // send in 1
    const fourthBalance = await token.balanceOf.call(buyerAddress, {from: buyerAddress, gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(fourthBalance) - fromBigNumberWeiToEth(thirdBalance), 1275, "The balance of the buyer was not incremented by 1275 FUEL");

    const weiRaised = await crowdfund.weiRaised.call({from: buyerAddress, gas: gasAmount});
    assert.equal(weiRaised.dividedBy(new BigNumber(10).pow(18)).toNumber(), 5, "The contract ether balance was not 5 ETH");

  });

  it("closeCrowdfund(): can close a crowdsale, and only vanbex can do it", async () => {

    const oneWeekInSeconds = 604800;
    await addSeconds(oneWeekInSeconds);
    const token = await FuelToken.new({from: vanbexAddress, gas: gasAmount});
    const crowdfund = await FuelCrowdfund.new(token.address, {from: vanbexAddress, gas: gasAmount});
    await token.setCrowdfundAddress(crowdfund.address, {from: vanbexAddress, gas: gasAmount});
    const platformAddress = await token.platformAddress.call();
    

    let initialCrowdfundBalance = await token.balanceOf.call(crowdfund.address, {gas: gasAmount});
    let initialPlatformBalance = await token.balanceOf.call(platformAddress, {gas: gasAmount});

    try {
      await crowdfund.closeCrowdfund({from: buyerAddress, gas: gasAmount});
    } catch(e) {
      assert.equal(true, true, "Buyer could close the crowdfund");
    }

    await crowdfund.closeCrowdfund({from: vanbexAddress, gas: gasAmount});
    
    const platformBalance = await token.balanceOf.call(platformAddress, {gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(platformBalance) - fromBigNumberWeiToEth(initialPlatformBalance), fromBigNumberWeiToEth(initialCrowdfundBalance), "The right amount wasn't tranferred from crowdfund to platform after closing the crowdfund");
    const newCrowdfundBalance = await token.balanceOf.call(crowdfund.address, {gas: gasAmount});
    assert.equal(fromBigNumberWeiToEth(newCrowdfundBalance), 0, "Crowdfund balance wasnt 0");

  });

  it("changeWalletAddress(): can change wallet address, and only vanbex can do it", async () => {
    const token = await FuelToken.new({from: vanbexAddress, gas: gasAmount});
    const crowdfund = await FuelCrowdfund.new(token.address, {from: vanbexAddress, gas: gasAmount});
    
    await token.setCrowdfundAddress(crowdfund.address, {from: vanbexAddress, gas: gasAmount});
    const currentWallet = await crowdfund.wallet.call();
    const walletAddress = accounts[7];
    assert.equal(currentWallet == walletAddress, false, "Current wallet address was already the same as the new one");

    try {
      await crowdfund.changeWalletAddress(walletAddress, {buyerAddress, gas: gasAmount});
    }catch(e) {
      assert(true, true);
      await crowdfund.changeWalletAddress(walletAddress, {buyerAddress, gas: gasAmount});
      
      const newWallet = await crowdfund.wallet.call();
      assert.equal(newWallet, walletAddress, "The new wallet address wasn't set");
    }
  });
});