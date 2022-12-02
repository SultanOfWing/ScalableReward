pragma solidity ^0.8.0;
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TKN is ERC20 {

    constructor () ERC20("Token", "TKN") {
        _mint(msg.sender, 1000000 * (10 ** uint256(decimals())));

        //Reward bank for contract creator
        transfer(0x5B38Da6a701c568545dCfcB03FcB875f56beddC4, 100000);
        //Test user Alice
        transfer(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2, 20000);
        //Test user Bob
        transfer(0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db, 15000);
        //Test user Charlie
        transfer(0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB, 25000);
        //Test user Dave
        transfer(0x617F2E2fD72FD9D5503197092aC168c91465E7f2, 30000);
    }
}
