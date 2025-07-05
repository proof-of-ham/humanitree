// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleDEX
 * @dev A basic automated market maker (AMM) for token swapping with liquidity provision
 * Implements constant product formula (x*y=k) for price determination
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}

contract SimpleDEX {
    // State variables
    IERC20 public token0;  // First token in the pair
    IERC20 public token1;  // Second token in the pair
    
    uint256 public reserve0;  // Reserve of token0
    uint256 public reserve1;  // Reserve of token1
    
    uint256 public totalLiquidity;  // Total liquidity tokens issued
    mapping(address => uint256) public liquidity;  // Liquidity tokens per user
    
    uint256 public constant FEE_BASIS_POINTS = 30;  // 0.3% fee
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event LiquidityAdded(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidityMinted
    );
    
    event LiquidityRemoved(
        address indexed provider,
        uint256 amount0,
        uint256 amount1,
        uint256 liquidityBurned
    );
    
    event TokensSwapped(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    // Constructor
    constructor(address _token0, address _token1) {
        require(_token0 != _token1, "SimpleDEX: Identical tokens");
        require(_token0 != address(0) && _token1 != address(0), "SimpleDEX: Zero address");
        
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }
    
    /**
     * @dev Add liquidity to the pool
     * @param amount0 Amount of token0 to add
     * @param amount1 Amount of token1 to add
     * @param to Address to mint liquidity tokens to
     */
    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        address to
    ) external returns (uint256 liquidityMinted) {
        require(amount0 > 0 && amount1 > 0, "SimpleDEX: Insufficient amounts");
        
        // Transfer tokens from user
        require(
            token0.transferFrom(msg.sender, address(this), amount0),
            "SimpleDEX: Transfer of token0 failed"
        );
        require(
            token1.transferFrom(msg.sender, address(this), amount1),
            "SimpleDEX: Transfer of token1 failed"
        );
        
        // Calculate liquidity to mint
        if (totalLiquidity == 0) {
            // First liquidity provision
            liquidityMinted = sqrt(amount0 * amount1);
            require(liquidityMinted > 0, "SimpleDEX: Insufficient liquidity minted");
        } else {
            // Subsequent liquidity provisions
            uint256 liquidity0 = (amount0 * totalLiquidity) / reserve0;
            uint256 liquidity1 = (amount1 * totalLiquidity) / reserve1;
            liquidityMinted = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
            require(liquidityMinted > 0, "SimpleDEX: Insufficient liquidity minted");
        }
        
        // Update state
        liquidity[to] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        reserve0 += amount0;
        reserve1 += amount1;
        
        emit LiquidityAdded(to, amount0, amount1, liquidityMinted);
    }
    
    /**
     * @dev Remove liquidity from the pool
     * @param liquidityAmount Amount of liquidity tokens to burn
     * @param to Address to send tokens to
     */
    function removeLiquidity(
        uint256 liquidityAmount,
        address to
    ) external returns (uint256 amount0, uint256 amount1) {
        require(liquidityAmount > 0, "SimpleDEX: Insufficient liquidity amount");
        require(liquidity[msg.sender] >= liquidityAmount, "SimpleDEX: Insufficient liquidity balance");
        
        // Calculate token amounts to return
        amount0 = (liquidityAmount * reserve0) / totalLiquidity;
        amount1 = (liquidityAmount * reserve1) / totalLiquidity;
        
        require(amount0 > 0 && amount1 > 0, "SimpleDEX: Insufficient amounts");
        
        // Update state
        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        reserve0 -= amount0;
        reserve1 -= amount1;
        
        // Transfer tokens to user
        require(token0.transfer(to, amount0), "SimpleDEX: Transfer of token0 failed");
        require(token1.transfer(to, amount1), "SimpleDEX: Transfer of token1 failed");
        
        emit LiquidityRemoved(to, amount0, amount1, liquidityAmount);
    }
    
    /**
     * @dev Swap token0 for token1
     * @param amountIn Amount of token0 to swap
     * @param minAmountOut Minimum amount of token1 to receive (slippage protection)
     * @param to Address to send token1 to
     */
    function swapToken0ForToken1(
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "SimpleDEX: Insufficient input amount");
        require(reserve0 > 0 && reserve1 > 0, "SimpleDEX: Insufficient liquidity");
        
        // Calculate output amount using constant product formula with fee
        uint256 amountInWithFee = amountIn * (BASIS_POINTS - FEE_BASIS_POINTS);
        uint256 numerator = amountInWithFee * reserve1;
        uint256 denominator = (reserve0 * BASIS_POINTS) + amountInWithFee;
        amountOut = numerator / denominator;
        
        require(amountOut >= minAmountOut, "SimpleDEX: Insufficient output amount");
        require(amountOut < reserve1, "SimpleDEX: Insufficient liquidity");
        
        // Transfer tokens
        require(
            token0.transferFrom(msg.sender, address(this), amountIn),
            "SimpleDEX: Transfer of token0 failed"
        );
        require(token1.transfer(to, amountOut), "SimpleDEX: Transfer of token1 failed");
        
        // Update reserves
        reserve0 += amountIn;
        reserve1 -= amountOut;
        
        emit TokensSwapped(msg.sender, address(token0), address(token1), amountIn, amountOut);
    }
    
    /**
     * @dev Swap token1 for token0
     * @param amountIn Amount of token1 to swap
     * @param minAmountOut Minimum amount of token0 to receive (slippage protection)
     * @param to Address to send token0 to
     */
    function swapToken1ForToken0(
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "SimpleDEX: Insufficient input amount");
        require(reserve0 > 0 && reserve1 > 0, "SimpleDEX: Insufficient liquidity");
        
        // Calculate output amount using constant product formula with fee
        uint256 amountInWithFee = amountIn * (BASIS_POINTS - FEE_BASIS_POINTS);
        uint256 numerator = amountInWithFee * reserve0;
        uint256 denominator = (reserve1 * BASIS_POINTS) + amountInWithFee;
        amountOut = numerator / denominator;
        
        require(amountOut >= minAmountOut, "SimpleDEX: Insufficient output amount");
        require(amountOut < reserve0, "SimpleDEX: Insufficient liquidity");
        
        // Transfer tokens
        require(
            token1.transferFrom(msg.sender, address(this), amountIn),
            "SimpleDEX: Transfer of token1 failed"
        );
        require(token0.transfer(to, amountOut), "SimpleDEX: Transfer of token0 failed");
        
        // Update reserves
        reserve1 += amountIn;
        reserve0 -= amountOut;
        
        emit TokensSwapped(msg.sender, address(token1), address(token0), amountIn, amountOut);
    }
    
    /**
     * @dev Get output amount for a given input (for price queries)
     * @param amountIn Input amount
     * @param reserveIn Reserve of input token
     * @param reserveOut Reserve of output token
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "SimpleDEX: Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "SimpleDEX: Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * (BASIS_POINTS - FEE_BASIS_POINTS);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * BASIS_POINTS) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    /**
     * @dev Get current exchange rate (token0 per token1)
     */
    function getExchangeRate() external view returns (uint256) {
        if (reserve1 == 0) return 0;
        return (reserve0 * 1e18) / reserve1;
    }
    
    /**
     * @dev Get pool information
     */
    function getPoolInfo() external view returns (
        uint256 _reserve0,
        uint256 _reserve1,
        uint256 _totalLiquidity,
        string memory symbol0,
        string memory symbol1
    ) {
        return (
            reserve0,
            reserve1,
            totalLiquidity,
            token0.symbol(),
            token1.symbol()
        );
    }
    
    /**
     * @dev Square root function (Babylonian method)
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
} 