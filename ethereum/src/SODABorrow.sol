pragma solidity ^0.5.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/ownership/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/contracts/math/SafeMath.sol";
import "./Pool.sol";

interface AggregatorInterface { function latestAnswer() external view returns (int256);}

contract SODABorrow is Ownable {
    using SafeMath for uint;
        
    enum LoanState {Repaid, Active, Liquidated}
    struct Loan {
        address borrower;
        LoanState state;
        IERC20 collateralToken;
        uint collateralAmount;
        uint loanAmount;
        uint taken;
        uint lastRate;
        uint lastRepay;
    }

    event Liquidation(uint indexed id, string cause);
    event LoanIssued(uint indexed id, address indexed borrower, uint amount, uint collateral);
    event LoanRepayment(uint indexed id, uint interestAmount, uint repaymentAmount);
    event CollateralReplenishment(uint indexed id, uint amount);
    event AnableCollateralToken(IERC20 indexed token);
    event DisableCollateralToken(IERC20 indexed token);
    
    mapping(address => bool) public isAvailableBTCToken;
    mapping(uint => uint) public ratesHistory;
    mapping(uint => Loan) public loan;
    uint public lastRate; // APR / 365 * 1e9 
    uint public nextID = 1; 
    Pool public pool;
    AggregatorInterface public btcPriceAggregator;
    
    constructor(Pool _pool, AggregatorInterface aggregator)  public {
        pool = _pool;
        btcPriceAggregator = aggregator;//0x1c44616CdB7FAe1ba69004ce6010248147CE019e
        lastRate = 90411;
    } 
    
    function setRate(uint value) public onlyOwner {
        require(ratesHistory[now / 1 days] == 0, "today's rate is already set");
        ratesHistory[now / 1 days] = lastRate = value;
    }
    
    function borrow(address borrower, uint amount, uint collateral, IERC20 collateralToken) public returns(uint loan_id) {
        require(isAvailableBTCToken[address(collateralToken)], "token is not available");
        require(pool.token().balanceOf(address(pool)) >= amount, "too large, loan pool has no funds");
        require(collateralToken.balanceOf(borrower) >= collateral, "insufficient funds");
        require(collateralToken.allowance(borrower, address(this)) >= collateral, "insufficient funds. use approve");
        require(collateral.mul( uint(btcPriceAggregator.latestAnswer()) ).mul(1e4) > amount.mul(135), "too low collateral");

        loan_id = nextID++;
        loan[loan_id] = Loan(
            borrower,
            LoanState.Active,
            collateralToken,
            collateral,
            amount,
            now,
            lastRate,
            now.div(1 days)
        );
        collateralToken.transferFrom(borrower, address(this), collateral);
        pool.send(borrower, amount);
        emit LoanIssued( loan_id, borrower, amount, collateral);
    }
    
    function repay(uint loan_id, uint amount) public {
        Loan storage _loan = loan[loan_id];
        uint interest = interestAmount(loan_id);
        require(amount >= interest, "the amount of payment must exceed the interest");
        pool.token().transferFrom(_loan.borrower, address(this), interest);
        uint repaymentAmount = amount.sub(interest);
        if(_loan.loanAmount > repaymentAmount){
            pool.token().transferFrom(_loan.borrower, address(pool), repaymentAmount);
            _loan.loanAmount -= repaymentAmount;
            _loan.lastRate = this.lastRate();
            _loan.lastRepay = now.div(1 days);
            emit LoanRepayment(loan_id, interest, repaymentAmount);
        } else {
            pool.token().transferFrom(_loan.borrower, address(pool), _loan.loanAmount);
            _loan.collateralToken.transfer(_loan.borrower, _loan.collateralAmount);
            delete loan[loan_id];
            emit LoanRepayment(loan_id, interest, _loan.loanAmount);
        }
    }
    
    function replenishCollateral(uint loan_id, uint amount) public {
        Loan storage _loan = loan[loan_id];
        require(_loan.state == LoanState.Active, "the loan isn't active");
        _loan.collateralToken.transferFrom(_loan.borrower, address(this), amount);
        _loan.collateralAmount = _loan.collateralAmount.add(amount); 
        emit CollateralReplenishment(loan_id, amount);
    }
    
    function liquidate(uint loan_id) public {
        Loan storage _loan = loan[loan_id];
        require(_loan.state == LoanState.Active, "the loan isn't active");
        if(_loan.taken + 90 days < now)
            _liquidate(loan_id, "loan was taken more then 90 days ago");
        else {
            require( 
                _loan.collateralAmount.mul(uint( btcPriceAggregator.latestAnswer() )).mul(1e3) 
                    < _loan.loanAmount.add(interestAmount(loan_id)).mul(11),
                    "loan secured by more than 110%");
            _liquidate(loan_id, "liquidation by price");
        }
    }
    
    function interestAmount(uint loan_id) public view returns (uint) {
        Loan memory _loan = loan[loan_id];
        uint rate = _loan.lastRate;
        uint start = _loan.lastRepay;
        uint today = now.div(1 days);
        uint sum = 0;
        for(uint i = start; i < today; i++)
            sum += rate = ratesHistory[i] > 0 ? ratesHistory[i]: rate;
        return _loan.loanAmount.mul(sum).div(1e9);
    }
    
    function setAvailableBTCToken(address BTCToken, bool available) public onlyOwner {
        require(isAvailableBTCToken[BTCToken] != available);
        isAvailableBTCToken[BTCToken] = available;
        if(available)
            emit AnableCollateralToken(IERC20(BTCToken));
        else
            emit DisableCollateralToken(IERC20(BTCToken));
    }
    
    function _liquidate(uint loan_id, string memory message) private {
        Loan storage _loan = loan[loan_id];
        _loan.collateralToken.transfer(owner(), _loan.collateralAmount);
        _loan.loanAmount = 0;
        _loan.state = LoanState.Liquidated;
        emit Liquidation(loan_id, message);
    }
}




