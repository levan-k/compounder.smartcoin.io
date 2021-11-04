// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IJoeRouter02 {
    function swapExactTokensForAVAXSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function addLiquidityAVAX(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountAVAXMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountAVAX,
            uint256 liquidity
        );
}

struct UserInfo {
    uint256 amount;
    uint256 rewardDebt;
}

interface IMasterChef {
    function pendingTokens(uint256 _pid, address _user)
        external
        view
        returns (
            uint256 pendingJoe,
            address bonusTokenAddress,
            string memory bonusTokenSymbol,
            uint256 pendingBonusToken
        );

    function userInfo(uint256 _pid, address _user)
        external
        view
        returns (UserInfo memory);

    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function emergencyWithdraw(uint256 _pid) external;
}

interface Token {
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

contract VaultV2Public {
    address public constant joeRouter =
        0x60aE616a2155Ee3d9A68541Ba4544862310933d4;
    address public constant token = 0x6D923f688C7FF287dc3A5943CAeefc994F97b290;
    address public constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    address[] public path;

    IMasterChef public constant masterChef =
        IMasterChef(0x1495b7e8d7E9700Bd0726F1705E864265724f6e2);
    uint256 public constant pid = 0;
    Token public constant lpToken =
        Token(0x7B7617c7B2236D7871741783caE8BCc222C2e05D);

    address public owner;
    bool public paused;

    mapping(address => uint256) deposits;
    uint256 public totalPoints;
    uint256 public multiplier = 1_000_000;

    constructor() {
        owner = msg.sender;
        path.push(token);
        path.push(WAVAX);
    }

    function pendingTokens() public view returns (uint256) {
        (uint256 pendingToken, , , uint256 pendingBonusToken) = masterChef
            .pendingTokens(pid, address(this));
        return
            pendingToken +
            pendingBonusToken +
            Token(token).balanceOf(address(this));
    }

    function balanceOf(address user) external view returns (uint256) {
        return deposits[user] * multiplier;
    }

    function deposit(uint256 _amount) external {
        require(!paused);
        require(_amount > 0);
        lpToken.transferFrom(msg.sender, address(this), _amount);
        if (lpToken.allowance(address(this), address(masterChef)) < _amount) {
            lpToken.approve(
                address(masterChef),
                115792089237316195423570985008687907853269984665640564039457584007913129639935
            );
        }

        reinvest();
        uint256 points = (_amount * 1_000_000) / multiplier;
        deposits[msg.sender] += points;
        totalPoints += points;

        masterChef.deposit(pid, _amount);
    }

    function reinvest() public {
        require(!paused);
        require(totalPoints > 0);

        uint256 balance = Token(token).balanceOf(address(this));
        if (Token(token).allowance(address(this), joeRouter) < balance) {
            Token(token).approve(
                joeRouter,
                115792089237316195423570985008687907853269984665640564039457584007913129639935
            );
        }
        uint256 half = (balance * 51) / 100;
        uint256 oldAVAX = address(this).balance;
        IJoeRouter02(joeRouter)
            .swapExactTokensForAVAXSupportingFeeOnTransferTokens(
                half,
                0,
                path,
                address(this),
                block.timestamp
            );

        IJoeRouter02(joeRouter).addLiquidityAVAX{value: address(this).balance}(
            token,
            balance - half,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 newLP = lpToken.balanceOf(address(this));
        multiplier += (newLP * 1_000_000) / totalPoints;

        if (msg.sender != address(this) && msg.sender != owner) {
            masterChef.deposit(pid, lpToken.balanceOf(address(this)));
            uint256 newAVAX = address(this).balance;
            payable(msg.sender).transfer((newAVAX - oldAVAX) / 2);
        }
    }

    function withdraw() external {
        require(!paused);
        require(msg.sender == owner);
        uint256 userDeposit = deposits[msg.sender];
        totalPoints -= deposits[msg.sender];
        deposits[msg.sender] = 0;
        masterChef.withdraw(pid, userDeposit * multiplier);
        lpToken.transfer(msg.sender, lpToken.balanceOf(address(this)));
        Token(token).transfer(
            msg.sender,
            (Token(token).balanceOf(address(this)) * userDeposit) / totalPoints
        );
    }

    function withdrawRaw() external {
        require(paused);
        uint256 userDeposit = deposits[msg.sender];
        deposits[msg.sender] = 0;
        lpToken.transfer(
            msg.sender,
            (lpToken.balanceOf(address(this)) * userDeposit) / totalPoints
        );
        Token(token).transfer(
            msg.sender,
            (Token(token).balanceOf(address(this)) * userDeposit) / totalPoints
        );
        totalPoints -= deposits[msg.sender];
    }

    function emergencyWithdraw() external {
        require(!paused);
        require(msg.sender == owner);
        paused = true;
        masterChef.emergencyWithdraw(pid);
    }

    function withdrawFee() external {
        require(msg.sender == owner);
        payable(owner).transfer(address(this).balance);
    }

    function setOwner(address _owner) external {
        require(msg.sender == owner);
        owner = _owner;
    }

    function setPaused(bool _paused) external {
        require(msg.sender == owner);
        paused = _paused;
    }

    receive() external payable {}
}
