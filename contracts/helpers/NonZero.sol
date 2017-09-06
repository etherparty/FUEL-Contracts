pragma solidity ^0.4.9;
/**
 * @title NonZero
 */
contract NonZero {

// Functions with this modifier fail if he 
    modifier nonZeroAddress(address _to) {
        require(_to != 0x0);
        _;
    }

    modifier nonZeroAmount(uint _amount) {
        require(_amount > 0);
        _;
    }

    modifier nonZeroValue() {
        require(msg.value > 0);
        _;
    }

    // prevents short address attack
    // standard size = 2 * 32
    modifier onlyPayloadSize(uint size) { // NEVER USED
	// we assert the msg data is greater than or equal to, because
	// a multisgi wallet will be greater than standard payload size of 64 bits
    assert(msg.data.length >= size + 4);
     _;
   } 


}