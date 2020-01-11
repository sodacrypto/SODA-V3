if(ethereum) ethereum.autoRefreshOnNetworkChange = false
const debug = true
const Web3 = require('web3');
const BN = Web3.utils.BN
const params = {
	lastPrice:0
}
const web3 = new Web3(ethereum)
const info = {
	DAI:  require('../static/contracts/DAI.json'),
	BTC:  require('../static/contracts/DeFiBTC.json'),
	Lend: require('../static/contracts/SODALend.json'),
	Borrow: require('../static/contracts/SODABorrow.json'),
	Price: require('../static/contracts/PriceAggregator.json'),
}
const contracts = []
const updaters = []
setInterval(() => {
	updaters.forEach(updater => updater())
},1000)

Promise.all([
	ethereum.enable(),
	web3.eth.getChainId()
]).then(start);

(function (stop){
	if(stop) return;
	window.web3 = web3
	window.BN = BN
	window.contracts = contracts
})(!debug);

function approve(token, owner, spender, amount){
	const max_amount = new BN(2).pow(new BN(256)).sub(new BN(1)).toString()
	return token.methods.allowance(owner, spender).call()
		.then(web3.utils.toBN)
		.then(x=>x.gte(new BN(amount)))
		.then( enough =>
			enough ? true : token.methods.approve(spender, max_amount).send()
		)
}

function start([[address], chainId]){
	contracts.DAI = new web3.eth.Contract(info.DAI.ABI, info.DAI[chainId],{from: address})
	contracts.BTC = new web3.eth.Contract(info.BTC.ABI, info.BTC[chainId],{from: address})
	contracts.Lend = new web3.eth.Contract(info.Lend.ABI, info.Lend[chainId],{from: address})
	contracts.Borrow = new web3.eth.Contract(info.Borrow.ABI, info.Borrow[chainId],{from: address})
	contracts.Price = new web3.eth.Contract(info.Price.ABI, info.Price[chainId],{from: address})
	const {DAI, BTC, Lend, Borrow, Price} = contracts
	updaters.push( () => DAI.methods.balanceOf(address).call().then(x=>{
		document.querySelector("[data-type=dai-balance]")
			.innerText = x / 1e18
	}))
	updaters.push( () => BTC.methods.balanceOf(address).call().then(x=>{
		document.querySelector("[data-type=btc-balance]")
			.innerText = x / 1e8
	}))
	updaters.push( () => Lend.methods.balanceOf(address).call().then(x=>{
		document.querySelector("[data-type=dao-balance]")
			.innerText = x / 1e18
	}))
	updaters.push( () => Lend.methods.getPoolBalance().call().then(x=>{
		document.querySelector("[data-type=pool-balance]")
			.innerText = x / 1e18
	}))
	updaters.push( () => Price.methods.latestAnswer().call().then(x=>{
		params.lastPrice = x
		document.querySelector("[data-type=btc-price]")
			.innerText = x / 1e8
	}))

	document.querySelectorAll('[data-type=contract-send]').forEach(form =>
		form.addEventListener('submit', function (e){
			e.preventDefault()
			const amount = this.amount.value * {
					DAI: 1e18,
					BTC: 1e8,
					Lend: 1e18
				}[this.dataset.contract]
			console.log(amount)
			contracts[this.dataset.contract]
				.methods[this.dataset.action]( amount.toFixed() ).send()
			this.reset()
		})
	)

	document.querySelector('[data-type=lend]')
		.addEventListener('submit', function (e){
			e.preventDefault()
			const amount = (this.amount.value * 1e18).toFixed()
			approve(DAI, address, Lend._address, amount)
				.then(() => 
					Lend.methods.lend(amount).send()
				)
			this.reset()
		})
	
	document.querySelector('[data-type=borrow]')
		.addEventListener('submit', function (e){
			e.preventDefault()
			const amount = (this.amount.value * 1e18).toFixed()
			const collateral = (this.collateral.value * 1e8).toFixed()
			approve(BTC, address, Borrow._address, collateral)
				.then(() => 
					Borrow.methods.borrow(address,amount,collateral,BTC._address).send()
				).then(console.log)
			this.reset()
		})
	Borrow.events.LoanIssued({fromBlock:0}, (err,y,z) => {
		const {id, borrower, amount, collateral} = y.returnValues
		const row = document.importNode(
			document.getElementById('template__loan').content.firstElementChild,
			true
		)
		updaters.push( () => Borrow.methods.loan(id).call().then(
			({collateralAmount, loanAmount})=>{
				if(loanAmount > 0){

					row.querySelector('[data-type=debt]').classList.add('debt')
					row.querySelector('[data-type=debt]').amount.placeholder =
						loanAmount / 1e18
					Borrow.methods.interestAmount(id).call().then(
						interest => {
							row.querySelector('[data-type=security]').innerText =
								(collateralAmount * params.lastPrice * 100000 / (loanAmount + interest)).toFixed(2)
							row.querySelector('[data-type=interest]').innerText = interest / 1e18
							row.querySelector('[data-type=liquidation-price]').innerText = 
								(1.1*(loanAmount - -interest) / 1e10 / collateralAmount )	.toFixed(2)		
						}
					)
				}
				else {
					row.querySelector('[data-type=debt]').classList.add('repaid')
					row.querySelector('[data-type=debt]').classList.remove('debt')
				}
				row.querySelector('[data-type=collateral]').innerText =
					collateralAmount / 1e8
			}
		))
		row.querySelector('[data-type=debt]').addEventListener('submit', function(e){
			e.preventDefault()
			const amount = (this.amount.value * 1e18).toFixed()
			approve(DAI, address, Borrow._address, amount)
				.then(() => 
					Borrow.methods.repay(id,amount).send()
				).then(console.log)
			this.reset()
		})
		row.querySelector('[data-type=id]').innerText = id
		row.querySelector('[data-type=borrower]').innerText = borrower
		row.querySelector('[data-type=amount]').innerText = amount / 1e18
		document.getElementById('loans').appendChild(row)
	})

}

