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

}