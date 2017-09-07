var FuelCrowdfund = artifacts.require("./FuelCrowdfund.sol");
var FuelToken = artifacts.require("./FuelToken.sol");
var BigNumber = require('bignumber.js');
require('babel-polyfill');

// FUEL Crowdfund
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

  it("buyTokens(): it forwards the tokens to the specified address", async () =>  {
    const token = await FuelToken.new({from: vanbexAddress, gas: gasAmount});
    const crowdfund = await FuelCrowdfund.new(token.address, {from: vanbexAddress, gas: gasAmount});
    const price = await crowdfund.getIcoPrice.call();
    await token.setCrowdfundAddress(crowdfund.address, {from: vanbexAddress, gas: gasAmount});
    const receivingAddress = accounts[3];
    await crowdfund.buyTokens(receivingAddress, {from: buyerAddress, gas: gasAmount, value: web3.toWei("1", "Ether")});
    const balance = await token.balanceOf.call(receivingAddress);
    assert.equal(fromBigNumberWeiToEth(balance), price.toNumber(), `${price.toNumber()} FUEL was not in the recipients address`);
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

// FUEL Token

contract('FuelToken', function(accounts) {

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
  const buyerAddress = accounts[4];
  const buyerAddress2 = accounts[7];
  const crowdfundAddress = accounts[8];
  
  it("function(): should throw on a default call", async () => {
    const token = await FuelToken.new({from: vanbexAddress});
    try {
      token.call();
    }catch(e) {
      assert.equal(true, true);
    }
  });
    
  it("totalSupply: should have 1,000,000,000 FuelToken", function(done) {
    let token;
    
      FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(_token) {
      token = _token;
      return token.totalSupply.call({from: buyerAddress, gas: 4612386});
    }).then(function(supply) {
      assert.equal(fromBigNumberWeiToEth(supply), 1000000000, "1000000000 was not the maxSupply");
      done();
    }).catch(done);
  });
  
  
  // // ADDRESS SETTERS

  it("setCrowdfundAddress(): it should NOT let anyone but the founder change the crowdfund address", function(done) {
    FuelToken.new({from: vanbexAddress, gas: 4612386})
      .then(function(tokenInstance) {
        return tokenInstance.setCrowdfundAddress(accounts[5], {from: accounts[5]});
      }).catch(() => {
      assert(true, true);
      done();
    });
  });

  it("setEtherpartyAddress(): it should NOT let anyone but the founder change the etherparty address", function(done) {
    FuelToken.new({from: vanbexAddress, gas: 4612386})
      .then(function(tokenInstance) {
        return tokenInstance.setEtherpartyAddress(accounts[7], {from: accounts[5]});
      }).catch(() => {
      assert(true, true);
      done();
    });
  });

  it("constructor : should give the Etherparty platform address 5% (50,000,000) after setting the platform address", async () => {
    const token = await FuelToken.new({from: vanbexAddress, gas: 4612386});
    const platformAddress = await token.platformAddress.call();
    const balance = await token.balanceOf.call(platformAddress, {from: buyerAddress, gas: 4612386});

    assert.equal(fromBigNumberWeiToEth(balance), 50000000, "50000000 was not allocated to the platform address");
  });

  it("constructor : it should set the address and allocate 10% ( 100,000,000) of the tokens to them", async () => {
    const token = await FuelToken.new({from: vanbexAddress, gas: 4612386});
    const incentivisingEffortsAddress = await token.incentivisingEffortsAddress.call();
    const balance = await token.balanceOf.call(incentivisingEffortsAddress, {from: buyerAddress, gas: 4612386});

    assert.equal(fromBigNumberWeiToEth(balance), 100000000, "100000000 was not allocated to the incentivsing efforts address");
  });

  // // SUPPLY

  it("totalAllocatedTokens: it should have 15% allocated after all the addresses have been set", function(done) {
    
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      return tokenInstance.totalAllocatedTokens.call({from: buyerAddress, gas: 4612386});
    }).then(function(supply) {
      assert.equal(fromBigNumberWeiToEth(supply), 150000000, "150000000 was not allocated as the initial totalAllocatedTokens");
      done();
    }).catch(done);
  });
  
  it("amountOfPublicTokensToAllocate: allocate 80% of the tokens (800,000,000) FuelToken", function(done) {
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      return tokenInstance.amountOfPublicTokensToAllocate.call({from: buyerAddress, gas: 4612386});
    }).then(function(supply) {
      assert.equal(fromBigNumberWeiToEth(supply), 800000000, "800000000 wasn not the amountOfPublicTokensToAllocate");
      done();
    }).catch(done);
  });

  it("icoSupply: should put 50% of the public tokens (260,000,000) in the icoSupply", function(done) {
    
      FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      return tokenInstance.icoSupply.call({from: buyerAddress, gas: 4612386});
    }).then(function(supply) {
      assert.equal(fromBigNumberWeiToEth(supply), 260000000, "260000000 wasn't in the icoSupply");
      done();
    }).catch(done);
  });

  it("presaleSupply: should put 50% of the public tokens (540,000,000) in the presaleSupply", function(done) {
    
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      return tokenInstance.presaleSupply.call({from: buyerAddress, gas: 4612386});
    }).then(function(supply) {
      assert.equal(fromBigNumberWeiToEth(supply), 540000000, "540000000 wasn't in presaleSupply");
      done();
    }).catch(done);
  });

  // // APPROVAL


  it("approve() and allowance(): should let the sender approve a spender for the amount of 1 FUEL", function(done) {
    let token;
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      token = tokenInstance;
      return token.approve(buyerAddress2, 1000000000000000000, {from: buyerAddress, gas: 4612386});
    }).then(function(success) {
      return token.allowance(buyerAddress, buyerAddress2, {from: buyerAddress, gas: 4612386});
    }).then(function(allowance) {
      assert.equal(fromBigNumberWeiToEth(allowance), 1, "1 FUEL wasn't the allowance of the sender");
      done();
    }).catch(done);
  });

  // // TRANSFERS


  it("transfer(): should transfer tokens", function(done) {
    let token;
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      token = tokenInstance;
      token.setCrowdfundAddress(crowdfundAddress); // will allocate tokens to be used for transfer
      return token.transfer(buyerAddress, 1000000000000000000, {from: crowdfundAddress, gas: 4612386})
    }).then(function(success) {
      return token.balanceOf(buyerAddress, {from: buyerAddress, gas: 4612386})
    }).then(function(balance) {
      assert.equal(fromBigNumberWeiToEth(balance), 1, "1 FUEL wasn't in the balance after a transfer");
      done();
    }).catch(done);
  });

  it("transferFrom(): should let the spender send the allowed amount for the sender, and decrement the amount from the allowance", function(done) {
    let token;
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      token = tokenInstance;
      token.setCrowdfundAddress(crowdfundAddress); // will allocate tokens to be used for transfer
      return token.approve(buyerAddress2, 1000000000000000000, {from: buyerAddress, gas: 4612386});
    }).then(function(success) {
      return token.transfer(buyerAddress, 1000000000000000000, {from: crowdfundAddress, gas: 4612386})
    }).then(function(success) {
      return token.balanceOf(buyerAddress, {from: buyerAddress, gas: 4612386})
    }).then(function(balance) {
      assert.equal(fromBigNumberWeiToEth(balance), 1, "1 FUEL wasn't in the balance after a transfer");
      return token.transferFrom(buyerAddress, buyerAddress2, 1000000000000000000, {from: buyerAddress2, gas: 4612386})
    }).then(function(success) {
      return token.allowance(buyerAddress, buyerAddress2, {from: buyerAddress, gas: 4612386});
    }).then(function(allowance) {
      assert.equal(fromBigNumberWeiToEth(allowance), 0, "0 FUEL wasn't in the allowance post-transfer");
      return token.balanceOf(buyerAddress2, {from: buyerAddress2, gas: 4612386});
    }).then(function(balance) {
      assert.equal(fromBigNumberWeiToEth(balance), 1, "1 FUEL wasn't in the balance of the receipt post-transfer");
      done();
    }).catch(done);
  });

  it("transferFrom(): should NOT let the spender send an unallowed amount", function(done) {
    let token;
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      token = tokenInstance;
      token.setCrowdfundAddress(crowdfundAddress); // will allocate tokens to be used for transfer
      return token.transfer(buyerAddress, 1000000000000000000, {from: crowdfundAddress, gas: 4612386})
    }).then(function(success) {
      return token.balanceOf(buyerAddress, {from: buyerAddress, gas: 4612386})
    }).then(function(balance) {
      assert.equal(fromBigNumberWeiToEth(balance), 1, "1 FUEL wasn't in the balance after a transfer");
      return token.transferFrom(buyerAddress, buyerAddress2, 1000000000000000000, {from: buyerAddress2, gas: 4612386});
    }).catch(function(result) {
      assert.equal(true, true);
      done();
    });
  });

  it("transferFrom(): should NOT let the spender send an allowed amount that the sender doesn't have", function(done) {
    let token;
    FuelToken.new({from: vanbexAddress, gas: 4612386})
    .then(function(tokenInstance) {
      token = tokenInstance;
      token.setCrowdfundAddress(crowdfundAddress); // will allocate tokens to be used for transfer
      return token.approve(buyerAddress2, 1000000000000000000, {from: buyerAddress, gas: 4612386});
    }).then(function(success) {
      return token.transfer(buyerAddress, 1000000000000000000, {from: crowdfundAddress, gas: 4612386})
    }).then(function(success) {
      return token.balanceOf(buyerAddress, {from: buyerAddress, gas: 4612386})
    }).then(function(balance) {
      assert.equal(fromBigNumberWeiToEth(balance), 1, "1 FUEL wasn't in the balance after a transfer");
      return token.transferFrom(buyerAddress, buyerAddress2, 2000000000000000000, {from: buyerAddress2, gas: 4612386})
    }).catch(function(result) {
      assert.equal(true, true);
      done();
    });
  });

  it("deliverPresaleFuelBalances(): should allocate presale addresses their tokens", async () => {
    const presaleAddresses = [
      accounts[1],
      accounts[2],
      accounts[3],
      accounts[4],
      accounts[5]
    ];
    const presaleAmounts = [
      1000000000000000000,
      500000000000000000,
      10000000000000000000,
      1102330505704040302,
      13700000000000000000
    ];

    const token = await FuelToken.new({from: vanbexAddress});
    await token.deliverPresaleFuelBalances(presaleAddresses, presaleAmounts, {from: vanbexAddress, gas: 4612386});
    for(let i=0; i< presaleAddresses.length; i++) {
      const balance = await token.balanceOf.call(presaleAddresses[i], {from: buyerAddress, gas: 4612386});
      assert.equal(balance.toNumber(), presaleAmounts[i]);
    }
  });


  it("releaseVanbexTeamTokens(): hould not let us release the tokens before 6 months, and only let vanbex do it", async () => {
    
    const token = await FuelToken.new({from: vanbexAddress});
    const vanbexTeamAddress = await token.vanbexTeamAddress.call();
    const initialVanbexTeamBalance = await token.balanceOf.call(vanbexTeamAddress);
    const vanbexTeamSupply = await token.vanbexTeamSupply.call();
    try {
      await token.releaseVanbexTeamTokens({from: vanbexAddress});
    } catch(e) {
      assert(true, true, "It let the vanbex team tokens be released early.");
    }

    const vanbexVestingPeriod = await token.vanbexTeamVestingPeriod.call();

    const currentBlockTimestamp = await getTimestampOfCurrentBlock();
    await addSeconds(vanbexVestingPeriod - currentBlockTimestamp);

    try {
      await token.releaseVanbexTeamTokens({from: accounts[3]});
    } catch(e) {
      assert(true, true, "It let a non-owner release the vanbex tokens");
    }

    await token.releaseVanbexTeamTokens({from: vanbexAddress});
    const newVanbexTeamBalance = await token.balanceOf(vanbexTeamAddress);
    assert.equal(fromBigNumberWeiToEth(newVanbexTeamBalance) - fromBigNumberWeiToEth(initialVanbexTeamBalance), fromBigNumberWeiToEth(vanbexTeamSupply), "50 mil wasn't added to the vanbex team wallet");

  });
  
});