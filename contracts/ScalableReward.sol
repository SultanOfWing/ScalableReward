pragma solidity ^0.8.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract ScalableReward {

    //SafeMath is not needed since 0.8+ version

    uint public totalDeposit = 0; //T
    address public owner;
    mapping(address => uint) public userFactorSnapshots; //So[]

    uint private reward = 0; 
    uint private currentFactor = 0; //S
    uint internal digits = 1e18;
    IERC20 internal TKN;
    mapping(address => uint) internal userDeposits; 

    constructor(address tokenAddress) {
        owner = msg.sender;
        TKN = IERC20(tokenAddress);
    }

    modifier notOwner() {
        require(msg.sender != owner, "creater cannot interact");
        _;
    }

    modifier notZero(uint amount) {
        require(amount > 0, "amount should be > 0");
        _;
    }

    modifier addrExists(address addr) {
        require(addr != address(0), "address does not exist");
        _;
    }

    modifier checkBalance(address payer, uint amount) {
        require(TKN.balanceOf(payer) >= amount, "insufficient funds"); 
        _;
    }

    function deposit(uint amount) external notOwner {  
        _deposit(msg.sender, amount);
    }

    function withdraw() external notOwner returns (uint) {
        return _withdraw(msg.sender, userDeposits[msg.sender]);
    }

    function unstakePart(uint amount) external notOwner {
        uint userDeposit = userDeposits[msg.sender];
        //Actually if user deposit = 0, then this check will not be passed
        require(amount < userDeposit, "amount bigger or equals to deposit"); 
        _withdraw(msg.sender, userDeposit);
        _deposit(msg.sender, userDeposit - amount);
    }

    function distribute(uint _reward) external notZero(_reward) {
        require(msg.sender == owner, "only creator can distribute funds");
        require(totalDeposit > 0, "total deposit = 0");
        bool send = TKN.transferFrom(msg.sender, address(this), _reward);
        require(send, "transfer failed");
        reward = _reward;
        actualizeCurrentFactor();
    }

    function actualizeCurrentFactor() internal {
        currentFactor = currentFactor + ((reward * digits) / totalDeposit);
    }

    function _deposit(address sender, uint amount) internal notZero(amount){
        require(userDeposits[sender] == 0, "stake already made");
        bool success = depositIncreasing(sender, amount);
        require(success, "deposit not succesfull");
    }

    function _withdraw(address sender, uint deposit) internal notZero(deposit) returns (uint) {
        uint delta = currentFactor - userFactorSnapshots[sender];
        require(delta >= 0, "should be monotonously increasing");
        uint userReward = ((currentFactor - userFactorSnapshots[sender]) * deposit) / digits;
        uint total = deposit + userReward;
        bool success = depositDecreasing(sender, total);
        require(success, "withdraw not succesfull");
        return total;
    }

    function depositIncreasing(address sender, uint amount) internal addrExists(sender) checkBalance(sender, amount) returns (bool){
        bool sent = TKN.transferFrom(sender, address(this), amount);
        if(!sent) {
            return false;
        }
        userDeposits[sender] = amount;
        userFactorSnapshots[sender] = currentFactor;
        totalDeposit += amount;
        return true;
    }

    function depositDecreasing(address sender, uint amount) internal addrExists(sender) checkBalance(address(this), amount) returns (bool) {
        bool sent = TKN.transfer(sender, amount);
        if(!sent) {
            return false;
        }
        totalDeposit -= userDeposits[sender];
        //stake inactive now
        userFactorSnapshots[sender] = 0;
        userDeposits[sender] = 0;
        return true;
    }

    function getDepositAmount(address staker) public view returns (uint) {
        return userDeposits[staker];
    }

    function getRewardBankBalance() public view returns (uint) {
        return TKN.balanceOf(address(this));
    }
}
