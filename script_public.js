'use strict'

const web3 = new Web3(window.ethereum)
console.log('Web3 instance is', web3)

const interval = 30
let loading = false

var timer

// Address of the selected account
let address = ''

const addresses = [
  '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
  '0x6D923f688C7FF287dc3A5943CAeefc994F97b290', // Token
  '0x1495b7e8d7E9700Bd0726F1705E864265724f6e2', // MasterChef
  '0x7B7617c7B2236D7871741783caE8BCc222C2e05D', // Joe LP Token (JLP)
  '0x7890a4176097926965cc84b69Cf6200Aa8d1487F', // Vault
  '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', // USDC
  '0xA389f9430876455C36478DeEa9769B7Ca4E3DDB1', // USDC - AVAX
]

const ABIs = [
  [
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
      name: 'balanceOf',
      inputs: [{ type: 'address', name: 'account', internalType: 'address' }],
    },
  ],
  [
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
      name: 'balanceOf',
      inputs: [{ type: 'address', name: 'account', internalType: 'address' }],
    },
    {
      type: 'function',
      stateMutability: 'nonpayable',
      outputs: [{ type: 'bool', name: '', internalType: 'bool' }],
      name: 'transfer',
      inputs: [
        { type: 'address', name: 'recipient', internalType: 'address' },
        { type: 'uint256', name: 'amount', internalType: 'uint256' },
      ],
    },
  ],
  [
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [
        { type: 'address', name: 'lpToken', internalType: 'contract IERC20' },
        { type: 'uint256', name: 'allocPoint', internalType: 'uint256' },
        { type: 'uint256', name: 'lastRewardTimestamp', internalType: 'uint256' },
        { type: 'uint256', name: 'accJoePerShare', internalType: 'uint256' },
        { type: 'address', name: 'rewarder', internalType: 'contract IRewarder' },
      ],
      name: 'poolInfo',
      inputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    },
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [
        { type: 'uint256', name: 'amount', internalType: 'uint256' },
        { type: 'uint256', name: 'rewardDebt', internalType: 'uint256' },
      ],
      name: 'userInfo',
      inputs: [
        { type: 'uint256', name: '', internalType: 'uint256' },
        { type: 'address', name: '', internalType: 'address' },
      ],
    },
  ],
  [
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
      name: 'allowance',
      inputs: [
        { type: 'address', name: 'owner', internalType: 'address' },
        { type: 'address', name: 'spender', internalType: 'address' },
      ],
    },
    {
      type: 'function',
      stateMutability: 'nonpayable',
      outputs: [{ type: 'bool', name: '', internalType: 'bool' }],
      name: 'approve',
      inputs: [
        { type: 'address', name: 'spender', internalType: 'address' },
        { type: 'uint256', name: 'amount', internalType: 'uint256' },
      ],
    },
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
      name: 'balanceOf',
      inputs: [{ type: 'address', name: 'account', internalType: 'address' }],
    },
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
      name: 'totalSupply',
      inputs: [],
    },
  ],
  [
    {
      inputs: [],
      name: 'pendingTokens',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      type: 'function',
      stateMutability: 'nonpayable',
      outputs: [],
      name: 'deposit',
      inputs: [{ type: 'uint256', name: '_amount', internalType: 'uint256' }],
    },
    { type: 'function', stateMutability: 'nonpayable', outputs: [], name: 'reinvest', inputs: [] },
    {
      inputs: [],
      name: 'withdraw',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'withdrawRaw',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  [
    {
      type: 'function',
      stateMutability: 'view',
      outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
      name: 'balanceOf',
      inputs: [{ type: 'address', name: 'account', internalType: 'address' }],
    },
  ],
]

const [wavax, coin, masterChef, lpToken, valut, usdc] = [0, 1, 2, 3, 4, 5].map(
  (index) => new web3.eth.Contract(ABIs[index], addresses[index])
)

async function init() {
  address = web3.currentProvider.selectedAddress

  document.querySelector('#selected-account').textContent = address
  document.getElementById('interval').innerText = interval

  const accountContainer = document.querySelector('#accounts')
  accountContainer.innerHTML = ''
  const template = document.querySelector('#template-balance')
  let clone = template.content.cloneNode(true)
  clone.querySelector('.address').textContent = 'AVAX Balance'
  clone.querySelector('.balance').id = 'eth-balance'
  clone.querySelector('.balance').textContent = '-'
  accountContainer.appendChild(clone)
  clone = template.content.cloneNode(true)
  clone.querySelector('.address').textContent = 'JLP Balance'
  clone.querySelector('.balance').id = 'jlp-balance'
  clone.querySelector('.balance').textContent = '-'
  accountContainer.appendChild(clone)
  clone = template.content.cloneNode(true)
  clone.querySelector('.address').textContent = 'SMRTr Balance'
  clone.querySelector('.balance').id = 'coin-balance'
  clone.querySelector('.balance').textContent = '-'
  accountContainer.appendChild(clone)
  clone = template.content.cloneNode(true)
  clone.querySelector('.address').textContent = 'JLP Staking'
  clone.querySelector('.balance').id = 'jlp-staking'
  clone.querySelector('.balance').textContent = '-'
  accountContainer.appendChild(clone)
  clone = template.content.cloneNode(true)
  clone.querySelector('.address').textContent = 'SMRTr Earning'
  clone.querySelector('.balance').id = 'coin-earning'
  clone.querySelector('.balance').textContent = '-'
  accountContainer.appendChild(clone)

  initTimer()
}

function fromWei(amount, decimals = 4) {
  return Number(web3.utils.fromWei(amount)).toFixed(decimals)
}

var balances = {}
function fetchAccountData() {
  Promise.all([
    web3.eth.getBalance(address),
    coin.methods.balanceOf(address).call(),
    lpToken.methods.balanceOf(address).call(),
    lpToken.methods.balanceOf(addresses[2]).call(),
    lpToken.methods.totalSupply().call(),
    masterChef.methods.userInfo(0, addresses[4]).call(),
    valut.methods.pendingTokens().call(),
    wavax.methods.balanceOf(addresses[3]).call(),
    coin.methods.balanceOf(addresses[3]).call(),
    wavax.methods.balanceOf(addresses[6]).call(),
    usdc.methods.balanceOf(addresses[6]).call(),
  ])
    .then(
      ([
        balance,
        coinBalance,
        lpBalance,
        lpLock,
        lpTotal,
        lpStaking,
        pendingRewards,
        totalAVAX,
        totalToken,
        usdcVol,
        avaxVol,
      ]) => {
        balances.avaxPrice = (avaxVol / usdcVol) * 1e12
        balances.coinBalance = coinBalance
        balances.lpBalance = lpBalance
        balances.price = totalAVAX / totalToken

        document.querySelector('#coin-price').textContent = `${balances.price.toFixed(8)} AVAX / ${(
          balances.price * balances.avaxPrice
        ).toFixed(6)} USD (${fromWei(totalAVAX)} AVAX + ${fromWei(totalToken)} SMRTr = ${fromWei(lpTotal)} JLP)`
        document.querySelector('#eth-balance').textContent = fromWei(balance)
        document.querySelector('#coin-balance').textContent = `${fromWei(coinBalance)} SMRTr`
        document.querySelector('#jlp-balance').textContent = `${fromWei(lpBalance)} JLP`
        const stakingPercent = ((lpStaking.amount / lpLock) * 100).toFixed(5)
        const avaxBalance = ((lpLock / lpTotal) * (totalAVAX / 1e18) * 2 * (lpStaking.amount / lpLock)).toFixed(4)
        document.querySelector('#jlp-staking').textContent = `${fromWei(lpStaking.amount)} / ${fromWei(
          lpLock
        )} (${stakingPercent}% - ${avaxBalance} AVAX)`
        const pending = fromWei(pendingRewards)
        if (!balances.rewards || pending < balances.rewards.pending) {
          balances.rewards = {
            pending,
            speed: 0,
            count: 0,
            timestamp: parseInt(Date.now() / 1000),
          }
        } else {
          const speed = pending - balances.rewards.pending
          const now = parseInt(Date.now() / 1000)
          const duration = now - balances.rewards.timestamp
          balances.rewards.pending = pending
          balances.rewards.speed =
            (balances.rewards.speed * balances.rewards.count + speed) / (balances.rewards.count + duration)
          balances.rewards.count = balances.rewards.count + duration
          balances.rewards.timestamp = now
        }
        const daily = balances.rewards.speed * 60 * 60 * 24
        document.querySelector('#coin-earning').textContent = `${pending} SMRTr (${(balances.price * pending).toFixed(
          4
        )} AVAX) - ${daily.toFixed(4)} SMRTr (${(daily * balances.price).toFixed(6)} AVAX) / day`

        addLog(
          `Price - ${balances.price.toFixed(
            8
          )}, Earning: ${pending} SMRTr, Balance: ${avaxBalance} AVAX (${stakingPercent}%)`
        )
      }
    )
    .catch(console.log)
}

function sendTx(to, data, callback) {
  if (loading) return
  loading = true

  data
    .send({ from: address })
    .then((signedTx) => {
      const sentTx = web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction)
      sentTx.on('receipt', (receipt) => {
        loading = false
        callback && callback()
        balances.rewards = {
          pending,
          speed: 0,
          count: 0,
        }
        fetchAccountData()
      })
      sentTx.on('error', (err) => {
        loading = false
        console.log('tx:', err)
      })
    })
    .catch((err) => {
      loading = false
      console.log('sign:', err)
    })
}

function deposit() {
  if (balances.lpBalance <= 0) return
  lpToken.methods
    .allowance(address, addresses[4])
    .call()
    .then(async (allowance) => {
      if (Number(fromWei(allowance)) < Number(fromWei(balances.lpBalance))) {
        sendTx(
          addresses[3],
          lpToken.methods.approve(addresses[4], '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
          () => sendTx(addresses[4], valut.methods.deposit(balances.lpBalance))
        )
      } else sendTx(addresses[4], valut.methods.deposit(balances.lpBalance))
    })
    .catch(console.log)
}

function harvest() {
  sendTx(addresses[4], valut.methods.reinvest())
}

function withdraw() {
  sendTx(addresses[4], valut.methods.withdraw())
  // sendTx(addresses[4], valut.methods.withdrawAll())
}

function initTimer() {
  if (timer) clearInterval(timer)
  fetchAccountData()
  timer = setInterval(() => {
    fetchAccountData()
  }, interval * 1000)
}

function addLog(text) {
  const log = document.createElement('div')
  log.innerText = `${new Date().toISOString()} - ${text}`
  document.getElementById('logs').prepend(log)
}

window.addEventListener('load', async () => {
  await window.ethereum.enable()
  await init()
})
