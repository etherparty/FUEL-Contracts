pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol'; // NOT USED Remove this 
import "./helpers/NonZero.sol";

contract FuelToken {    
    function transferFromCrowdfund(address _to, uint256 _amount) returns (bool success);
    function finalizeCrowdfund() returns (bool success);
}

contract FuelCrowdfund is NonZero, Ownable {
    
    // safemath to prevent integer overflow/underflow
    using SafeMath for uint;

    // VARIABLE INITIALIZATION

    // address of the deployed FUEL Token contract
    address tokenAddress;
    
    // address of secure wallet to send crowdfund contributions to
    address public wallet;

    // instance of the contract of the token being sold
    FuelToken public token;

    // Amount of wei currently raised
    uint256 public weiRaised = 0;
    // UNIX timestamp of when the crowdfund starts
    uint256 public startsAt;
    // UNIX timestamp of when the crowdfund ends
    uint256 public endsAt;
    
    // EVENTS

    // Emitted upon owner changing the wallet address
    event WalletAddressChanged(address _wallet);

    // Emitted upon crowdfund being finalized
    event AmountRaised(address beneficiary, uint amountRaised);

    // Emmitted upon purchasing tokens
    event TokenPurchase(address indexed purchaser, uint256 value, uint256 amount);

    // MODIFIERS
    // Functions with this modifier fail is the crowdfund is not open
    modifier crowdfundIsActive() {
        assert(now >= startsAt && now <= endsAt);
        _;
    }

    function FuelCrowdfund(address _tokenAddress) payable {
        wallet = 0x854f7424b2150bb4c3f42f04dd299318f84e98a5;
        startsAt = 1505458800; // Sept 15 
        endsAt = 1507852969; // 4 weeks / 28 days later: Oct 13, 00:00:00 UTC
        tokenAddress = _tokenAddress;
        token = FuelToken(tokenAddress);
    }

    function changeWalletAddress(address _wallet) onlyOwner {
        wallet = _wallet;
        WalletAddressChanged(_wallet);
    }

    // any ether sent to this contract will enter in to the buyTokens() function
    function () payable nonZeroValue {
        buyTokens();
    }

    // disburses FUEL for ETH
    function buyTokens() internal crowdfundIsActive {
        // get the amount of wei sent
        uint256 weiAmount = msg.value;
        // increment our wei raised
        weiRaised = weiRaised.add(weiAmount);
        // calculate amount of tokens to return to the contributor
        uint256 tokens = weiAmount * getIcoPrice();

        wallet.transfer(weiAmount);

        if (!token.transferFromCrowdfund(msg.sender, tokens)) {
            revert();
        }

        TokenPurchase(msg.sender, weiAmount, tokens);
    }

    
    function closeCrowdfund() external onlyOwner returns (bool success) {
        AmountRaised(wallet, weiRaised);
        // if crowdsale tokens were unsold, transfer them to the platform supply.
        token.finalizeCrowdfund();
        return true;
    }

    // Returns FUEL per Wei depending on current date
    function getIcoPrice() internal returns (uint price) {
        if (now > (startsAt + 3 weeks)) {
            // week 4
           return 1275;
        } else if (now > (startsAt + 2 weeks)) {
            // week 3
           return 1700;
        } else if (now > (startsAt + 1 weeks)) {
            // week 2
            return 2250;
        } else {
            // week 1
            return 3000;
        }
    }
}