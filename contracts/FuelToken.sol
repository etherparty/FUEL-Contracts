pragma solidity ^0.4.15;

import "zeppelin-solidity/contracts/math/SafeMath.sol";

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20.sol';
import "./helpers/NonZero.sol";

// ROPSTEN: 0xe3af48b9cc5a7a6221c860a2e0f746f6ee39ac2e
contract FuelToken is ERC20, Ownable, NonZero {

    // safemath to prevent integer overflow/underflow
    using SafeMath for uint;

    // TOKEN INFORMATION
    string public constant name = "Fuel Token";
    string public constant symbol = "FUEL";

    uint public decimals = 18;
    
    // user balances
    mapping (address => uint256) balances;
    // user allowances
    mapping (address => mapping (address => uint256)) allowed;

    // VARIABLE INITIALIZATION
    
    // total FUEL allocated
    uint256 public totalAllocatedTokens;
    // reserve supply by Vanbex
    uint256 public vanbexTeamSupply;
    // Etherparty platform supply
    uint256 public platformSupply;
    // Total amount of Public Tokens released by W3 for the public
    uint256 public amountOfPublicTokensToAllocate;
    //amount for presale
    uint256 public presaleSupply;
    // amount of presale tokens remaining, decremented as we allocate them
    uint256 public presaleAmountRemaining;
    // ico amount
    uint256 public icoSupply;
    // extra for incentivising efforts
    uint256 public incentivisingEffortsSupply;
    // the timestamp of crowdsale ending 
    uint256 public crowdfundEndsAt;
    // the timestamp of when vanbex can transfer tokens from the vanbexAddress
    uint256 public vanbexTeamVestingPeriod;

    // address of the crowdfund
    address public crowdfundAddress;
    // address for vanbex team portion of tokens to be stored and locked for 6 months
    address public vanbexTeamAddress;
    // address for etherparty platform portion of tokens to be sold in the app
    address public platformAddress;
    // address for our reserve fund of incentivising efforts
    address public incentivisingEffortsAddress;
    // address for our reserve fund of incentivising efforts
    address public etherpartyAddress;

    // set to true when presale is finalized, ensures it can only be done once
    bool public presaleFinalized = false;
    // set to true when crowdfund is finalized, ensures it can only be done once
    bool public crowdfundFinalized = false;

    // EVENTS

    // called when the crowdsale is finalized and funding goal is checked
    event CrowdfundFinalized(uint tokens);
    // called when the crowdsale is finalized and funding goal is checked
    event PresaleFinalized(uint tokens);

    // MODIFIERS

    // modifiers with this function fail if etherparty is not the sender
    modifier onlyEtherparty() {
        require(msg.sender == etherpartyAddress);
        _;
    }
    // modifiers with this function fail if we havent finalized the crowdfund yet
    modifier notBeforeCrowdfundEnds(){
        require(now >= crowdfundEndsAt);
        _;
    }

    // checks the vanbex team and doesnt allow them to withdraw before six months is up
    modifier checkVanbexTeamVestingPeriod() {
        assert(now >= vanbexTeamVestingPeriod);
        _;
    }

    // modifiers with this function fail if crowdfund is not the sender
    modifier onlyCrowdfund() {
        require(msg.sender == crowdfundAddress);
        _;
    }

    // initialize our hard-coded variables in the constructor
    function FuelToken() payable {
        crowdfundEndsAt = 1507852800; // Oct 13, 00:00:00 UTC  - 1507852800
        vanbexTeamVestingPeriod = crowdfundEndsAt.add(183 * 1 days);  //limit of 6 months

        totalSupply = 1 * 10**27; // 100% - 1 billion total FUEL tokens with 18 decimals
        vanbexTeamSupply = 5 * 10**25; // 5% - 50 million for etherparty team
        platformSupply = 5 * 10**25;// 5% - 50 million to be sold on the etherparty platform in-app
        incentivisingEffortsSupply = 1 * 10**26; // 10% - 100 million for incentivising efforts
        presaleSupply = 54 * 10**25; // 540,000,000 fuel tokens available for presale with overflow for bonus included
        icoSupply = 26 * 10**25; // 260 million fuel tokens for ico with potential for extra after finalizing presale
        amountOfPublicTokensToAllocate = presaleSupply + icoSupply; // total amount of tokens available to the public
        presaleAmountRemaining = presaleSupply; // set it to max, decrement as we allocate presale tokens.

        vanbexTeamAddress = 0x413ea1484137526f3b1bd412e2f897c94c8e198d; // set vanbex team address, our tokens will be released there after 6 months
        platformAddress = 0xa1602060f4630ef560009a3377a6b788d2b90484; // set platform address for Etherparty, where tokens will be held and allowed to be used by Etherparty address
        incentivisingEffortsAddress = 0xc82fe29c67e63df7a09902140c5354fd6279c86c; // set incentivising efforts address

        addToBalance(incentivisingEffortsAddress, incentivisingEffortsSupply); // give them their supply
        addToBalance(platformAddress, platformSupply); // give that address the platform supply

        allocateTokens(incentivisingEffortsSupply); // allocate the tokens
        allocateTokens(platformSupply); // allocate tokens
    }

    // Sets the crowdfund address
    function setCrowdfundAddress(address _crowdfundAddress) external onlyOwner nonZeroAddress(_crowdfundAddress) {
        require(crowdfundAddress == 0x0); // only set once
        crowdfundAddress = _crowdfundAddress;
        addToBalance(crowdfundAddress, icoSupply); // give crowdfund the ico supply  
    }

    // Sets the etherparty address
    function setEtherpartyAddress(address _etherpartyAddress) external onlyOwner nonZeroAddress(_etherpartyAddress) {
        etherpartyAddress = _etherpartyAddress;  
    }
    
    
    // returns the fuel token balance of an address
    function balanceOf(address _owner) constant returns (uint256 balance) {
        return balances[_owner];
    }

    // transfer from the sender to another address
    function transfer(address _to, uint256 _amount) notBeforeCrowdfundEnds nonZeroAmount(_amount) returns (bool success) {
        require(balanceOf(msg.sender) >= _amount);
        uint recipientBalance = balanceOf(_to); // this is extraneous. OpenZeppelin Safemath lib takes care of that -- i would remove both lines
        require(recipientBalance + _amount > recipientBalance); // and theres no integer overflow

        decrementBalance(msg.sender, _amount); // decrement sender's fuel
        addToBalance(_to, _amount); // increment recipient's fuel
        Transfer(msg.sender, _to, _amount); // send transfer event
        return true;
    }

    // transfer from the sender to another address
    function transferFromCrowdfund(address _to, uint256 _amount) onlyCrowdfund nonZeroAmount(_amount) returns (bool success) {
        // assert the crowdfund has enough to send
        assert(balanceOf(crowdfundAddress) >= _amount);

        uint recipientBalance = balanceOf(_to);
        // check for interger overflow on recipient balance
        require(recipientBalance + _amount > recipientBalance);

        decrementBalance(crowdfundAddress, _amount); // decrement crowdfund's fuel
        addToBalance(_to, _amount); // increment recipient's fuel
        allocateTokens(_amount); // allocate tokens

        Transfer(crowdfundAddress, _to, _amount); // send transfer event
        return true;
    }

    // lets the etherparty address transfer out of the platform supply to sell in-app
    function transferFromPlatform(address _to, uint256 _amount) onlyEtherparty nonZeroAmount(_amount) returns (bool success) {
        // assert the crowdfund has enough to send
        assert(balanceOf(platformAddress) >= _amount);

        uint recipientBalance = balanceOf(_to);
        // check for interger overflow on recipient balance
        require(recipientBalance + _amount > recipientBalance); 

        decrementBalance(platformAddress, _amount); // decrement the platform's fuel
        addToBalance(_to, _amount); // increment recipient's fuel
        
        Transfer(platformAddress, _to, _amount); // send transfer event
        return true;
    }

    // transfers from one address to another if the allowance is set by the _from
    function transferFrom(address _from, address _to, uint256 _amount) notBeforeCrowdfundEnds returns (bool success) { // add nonZeroAmount(_amount) modifier here
        
        uint senderBalance = balanceOf(_from);
        require(senderBalance >= _amount);// if sender has enough to send
        require(allowance(_from, msg.sender) >= _amount); // and sender is allowed to send that amount from that address
        uint recipientBalance = balanceOf(_to);
        require(recipientBalance + _amount > recipientBalance); // and theres no integer overflow

        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_amount); // decrement the allowance amount sent
        decrementBalance(_from, _amount); // decrement the from address's fuel
        addToBalance(_to, _amount); // increment the recipient's fuel
        
        Transfer(_from, _to, _amount); // send transfer event
        
        return true;
    }

    function approve(address _spender, uint256 _value) returns (bool success) {
        require((_value == 0) || (allowance(msg.sender, _spender) == 0));
        allowed[msg.sender][_spender] = _value;
        Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }

    // if tokens exist at the end of the presale, transfer them.
    function finalizePresale() external onlyOwner returns (bool success) {
        require(presaleFinalized == false);
        uint256 amount = presaleAmountRemaining;
        // if we haven't allocated all of our tokens
        if (amount != 0) {
            // give them to the crowdfund to be sold there
            presaleAmountRemaining = 0;
            addToBalance(crowdfundAddress, amount);
        }
        presaleFinalized = true;
        PresaleFinalized(amount);
        return true;
    }
    
    // if tokens exist at the end of the crowdfund, transfer them.
    // called only via crowdfund closeCrowdfund() method
    function finalizeCrowdfund() external onlyCrowdfund notBeforeCrowdfundEnds returns (bool success) {
        require(crowdfundFinalized == false);
        uint256 amount = balanceOf(crowdfundAddress);
        // if there are unsold tokens
        if (amount > 0) {
            // get the remaining tokens
            // nullify crowdfund address
            balances[crowdfundAddress] = 0;
            // give the platform the tokens, where they will be sold in-app.
            addToBalance(platformAddress, amount);
            Transfer(crowdfundAddress, platformAddress, amount); // send transfer event
        }
        // emit an event declaring how many tokens were left over
        crowdfundFinalized = true;
        CrowdfundFinalized(amount);
        return true;
    }


    // takes a batch of presale addresses and delivers them their fuel. The arrays match, mimicking an associate array
    // where _batchOfAddresses[i]'s necessary amount of fuel is _amountOfFuel[i].
    function deliverPresaleFuelBalances(address[] _batchOfAddresses, uint[] _amountOfFuel) external onlyOwner returns (bool success) {
        for (uint256 i = 0; i < _batchOfAddresses.length; i++) {
            deliverPresaleFuelBalance(_batchOfAddresses[i], _amountOfFuel[i]);            
        }
        return true;
    }

    // assigns an amount of fuel to an address
    function deliverPresaleFuelBalance(address _accountHolder, uint _amountOfBoughtFuel) internal onlyOwner {
        require(balanceOf(_accountHolder) == 0); // or else they already have their tokens, as we deliver in one lump sum
        // allocate tokens to user
        addToBalance(_accountHolder, _amountOfBoughtFuel);
        Transfer(this, _accountHolder, _amountOfBoughtFuel); // send transfer event
        // decrement amount from presale fuel remaining
        presaleAmountRemaining = presaleAmountRemaining.sub(_amountOfBoughtFuel);
        // add to token allocation total
        allocateTokens(_amountOfBoughtFuel);        
    }

    // Release vanbex team supply after vesting period is finished.
    function releaseVanbexTeamTokens() checkVanbexTeamVestingPeriod onlyOwner {
        require(vanbexTeamSupply > 0);
        uint256 amount = vanbexTeamSupply;
        vanbexTeamSupply = 0;
        addToBalance(vanbexTeamAddress, amount);
        Transfer(this, vanbexTeamAddress, amount); // send transfer event
        
        allocateTokens(amount);

    }

    // Safemath helpers for reusability

    // add to a user's balance of tokens
    function addToBalance(address _address, uint _amount) internal {
    	balances[_address] = balances[_address].add(_amount);
    }

    // subtract from a user's balance of tokens
    function decrementBalance(address _address, uint _amount) internal {
    	balances[_address] = balances[_address].sub(_amount);
    }

    // add to totalAllocatedTokens
    function allocateTokens(uint _amount) internal {
    	totalAllocatedTokens = totalAllocatedTokens.add(_amount);
    }

    // this contract does not accept ether to it's default payable function.
    function () {
        revert(); // return unused gas to sender
    }
}