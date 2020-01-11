pragma solidity ^0.5.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC20/ERC20Detailed.sol";
import "./SpenderRole.sol";


contract Pool is SpenderRole {    
    ERC20Detailed public token;
    
    constructor(ERC20Detailed _token) public {
        token = _token;
    }
    
    function send(address to, uint value) public onlySpender {
        token.transfer(to, value);
    }
}