// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockWLD
 * @dev Mock Worldcoin Token for testing swap and donation functionality
 * ERC-20 token with 18 decimals and symbol WLD
 */
contract MockWLD {
    // Token metadata
    string public name = "Mock Worldcoin";
    string public symbol = "WLD";
    uint8 public decimals = 18;
    
    // Total supply - 1 billion tokens (like real WLD)
    uint256 public totalSupply = 1_000_000_000 * 10**decimals;
    
    // Balances and allowances
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    // Faucet functionality for testing
    mapping(address => uint256) public lastFaucetClaim;
    uint256 public faucetAmount = 100 * 10**decimals; // 100 WLD per claim
    uint256 public faucetCooldown = 1 hours; // Can claim once per hour
    
    event FaucetClaim(address indexed recipient, uint256 amount);
    
    /**
     * @dev Constructor - mints initial supply to deployer
     */
    constructor() {
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    /**
     * @dev Transfer tokens
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "MockWLD: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "MockWLD: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev Approve spender to transfer tokens
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "MockWLD: approve to zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @dev Transfer tokens from one address to another (with allowance)
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(to != address(0), "MockWLD: transfer to zero address");
        require(balanceOf[from] >= amount, "MockWLD: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "MockWLD: insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev Faucet function - allows users to claim test tokens
     */
    function faucet() public {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + faucetCooldown,
            "MockWLD: faucet cooldown not met"
        );
        require(
            balanceOf[address(this)] >= faucetAmount,
            "MockWLD: insufficient faucet funds"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        balanceOf[address(this)] -= faucetAmount;
        balanceOf[msg.sender] += faucetAmount;
        
        emit FaucetClaim(msg.sender, faucetAmount);
        emit Transfer(address(this), msg.sender, faucetAmount);
    }
    
    /**
     * @dev Fund the faucet (only owner can do this)
     */
    function fundFaucet(uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "MockWLD: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[address(this)] += amount;
        
        emit Transfer(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Get faucet info for user
     */
    function getFaucetInfo(address user) public view returns (
        uint256 nextClaimTime,
        uint256 claimAmount,
        bool canClaim
    ) {
        nextClaimTime = lastFaucetClaim[user] + faucetCooldown;
        claimAmount = faucetAmount;
        canClaim = block.timestamp >= nextClaimTime && balanceOf[address(this)] >= faucetAmount;
    }
} 