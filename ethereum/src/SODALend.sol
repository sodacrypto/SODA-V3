pragma solidity ^0.5.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC20/ERC20Detailed.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/ownership/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/math/SafeMath.sol";
import "https://github.com/vittominacori/solidity-linked-list/blob/master/contracts/StructuredLinkedList.sol";
import "./Pool.sol";
import "./Util.sol";

contract SODALend is Ownable, ERC20, ERC20Detailed {
    using StructuredLinkedList for StructuredLinkedList.List;
    
    event Test(address test);
    
    StructuredLinkedList.List holders;
    Pool internal pool;
    uint public minLendAmount = 1;
    uint public windowCloseTime = now + 1 days;
    
    constructor(Pool _pool)
        ERC20Detailed(
            Util.concat("SODA DAO (",_pool.token().symbol(), ")"),
            Util.concat("SODA",_pool.token().symbol()),
            _pool.token().decimals()
        ) 
        public 
    {
        pool = _pool;
    }
    
    modifier withOpenedWindow() {
        require(now < windowCloseTime || now > windowCloseTime + 60 days, "window must be opened");
        _;
    }
    
    modifier withClosedWindow() {
        require(now >= windowCloseTime, "window must be closed");
        _;
    }
       
    function getPool() view public returns(address) {return address(pool);}
    function getPoolBalance() view public returns (uint) {return pool.token().balanceOf(address(pool));}
    
    function _transfer(address,address,uint256) internal {revert("token is not transferable");}
    
    function lend(uint amount) public withOpenedWindow {
        require(amount >= minLendAmount, "too small amount");
        require(pool.isSpender(address(this)), "this contract has no access to the pool");
        
        if(!holders.nodeExists(uint(msg.sender)))
            holders.push(uint(msg.sender), true);
            
        pool.token().transferFrom(msg.sender, address(pool), amount);
        _mint(msg.sender, amount);                  // 70%
        _mint(address(this), amount.mul(3).div(7)); // 30%   
    }
    
    function withdraw(uint amount) public withOpenedWindow {
        _burn(msg.sender, amount);                  // 70%
        _burn(address(this), amount.mul(3).div(7)); // 30%
        pool.send(msg.sender, amount);    
        if(balanceOf(msg.sender) == 0)
            holders.remove(uint(msg.sender));
    }
    
    function distribute(uint windowSize) public onlyOwner withClosedWindow {
        windowCloseTime = now + windowSize * 1 hours;
        uint amount = pool.token().balanceOf(address(this));
        require(amount > 0, "there are no funds for distribution");
        uint total = totalSupply();
        uint sum = 0;
        (bool exist, uint current) = holders.getNextNode(0);
        while(current != 0){
            uint b = balanceOf(address(current));
            uint part = amount.mul(b).div(total);
            sum += part;
            pool.token().transfer(address(current), part);
            
            (exist, current) = holders.getNextNode(current);
        }
        pool.token().transfer(owner(), amount.sub(sum));
    }
}

