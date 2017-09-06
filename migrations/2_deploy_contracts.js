var FuelToken = artifacts.require("./FuelToken.sol");
var FuelCrowdfund = artifacts.require("./FuelCrowdfund.sol");

// We deploy as a chain of promises to use the deployed addresses in subsequent deploys
module.exports = function(deployer) {
  deployer.deploy(FuelToken)
 .then(function() {
  	return deployer.deploy(FuelCrowdfund, FuelToken.address);
 }).then(function() {
 	return FuelToken.deployed().then(function(instance) {
 		instance.setCrowdfundAddress(FuelCrowdfund.address);
 	});
 }).catch(function(e) {
 	console.error(e);
 });
};
