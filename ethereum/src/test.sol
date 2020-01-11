pragma solidity ^0.5.0;

import "./Pool.sol";
import "./SODABorrow.sol";
import "./SODALend.sol";


contract FakeAggregator is AggregatorInterface {
	int price;
	constructor(uint p) public {price = int(p);}
	function currentAnswer() external view returns (int256){return price;}
}
contract ERC20Test is ERC20, ERC20Detailed{
    constructor(string memory p1, string memory p2, uint8 p3) public ERC20Detailed(p1, p2, p3) {}
    function mint(address account, uint amount) public {
        _mint(account, amount);
    }
    function mint(uint amount) public {
        _mint(msg.sender, amount);
    }
    function burn(address account, uint amount) public {
        _burn(account, amount);
    }
    function burn(uint amount) public {
        _burn(msg.sender, amount);
    }
}
contract SODABT is SODABorrow{
    constructor(Pool pool) public SODABorrow(pool, new FakeAggregator(719694e6)){}
}
contract DAI is ERC20Test("Dai Stablecoin", "DAI", 18){}
contract DEFI_BTC is ERC20Test("DeFi BTC", "DBTC", 8){}
