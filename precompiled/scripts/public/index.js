require('ion-rangeslider');
const Web3 = require('web3')
const BN = Web3.utils.BN

String.prototype.toBigIntString = function (precision = 0){
	const [head, tail=''] = this.split('.')
	const buffer = [head,tail.slice(0,precision)]
	for(let i = 0; i < precision - tail.length; i++) buffer.push(0)
	return buffer.join('')
} 

HTMLElement.prototype.rebuild = function (){
	this.parentNode.replaceChild(document.importNode(this,true), this)
}

// String.prototype.fromBigIntString = function (precision = 0){
// 	if(precision == 0) return this.toString()
// 	if(precision < 0 ) throw "negative precision"
// 	const head = this.slice(0, -precision )
// 	const tail = this.slice( -precision)
// 	const buffer = [head, '.']

// 	for(let i = 0; i < precision - tail.length; i++) buffer.push(0)
// 	buffer.push(tail)
// 	return buffer.join('')
// } 

const subsciptions = []

Date.prototype.toMyString = function(){
	return this.toLocaleString(undefined, {
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	})
}

const templates = new class {
	get(name){
		return document.importNode(
			document.getElementById(`js_template__${name}`).content.firstChild,
			true
		)
	}
}
const event_reduplicator = new function(){
	const tmp = new Set()
	this.check = (event) => {
		const key = `${event.blockNumber}_${event.blockNumber}`
		if(tmp.has(key)) return true
		tmp.add(key)
		return false
	}
	this.clear = () => tmp.clear()
}


function approve(token, owner, spender, amount){
	const max_amount = new BN(2).pow(new BN(256)).sub(new BN(1)).toString()
	return token.methods.allowance(owner, spender).call()
		.then(x => new BN(x) )
		.then(x => x.gte(new BN(amount)))
		.then( enough =>
			enough ? true : token.methods.approve(spender, max_amount).send()
		)
}

function setSecurity(security, status, sv){
	if(!sv.classList.contains('security-view'))
		throw "wrong security-view"
	const state = sv.dataset.state =
		status == 2    ? 'repaid' : 
		status == 3    ? 'liqudated' : 
		security < 110 ? 'liquidation' :
		security < 180 ? 'danger' :
		security < 250 ? 'safe' :
						 'very-safe'
	
	sv.querySelector('.security-view__amount').innerText = 
		parseFloat(security) ? security : null

	sv.querySelectorAll('.security-view__label').forEach(label => {
		if(label.dataset.state == state)
			label.classList.remove('hide')
		else label.classList.add('hide')
	})

}

const enableEhereum = () => {
	const web3 = new Web3(ethereum)
	Promise.all([
		ethereum.enable().then(x=> x[0]),
		web3,
		web3.eth.getChainId()
	]).then(start)
}

function changeAccountsHandler(accounts){
	if (accounts.length > 0) enableEhereum()
	else {
		document.querySelectorAll('[data-type=account]')
			.forEach(x => x.innerText = null)
		document.querySelector('.pop-up').classList.add('open')
	}
}

const params = {}
const info = {
	DAI:  require('../static/contracts/DAI.json'),
	testBTC:  require('../static/contracts/DeFiBTC.json'),
	LendDAI: require('../static/contracts/SODALend.json'),
	BorrowDAI: require('../static/contracts/SODABorrow.json'),
	Price: require('../static/contracts/PriceAggregator.json'),
}
const updater = new class Updater {
	constructor(){
		this.updaters = []
		this.start()
		this.requests = {}
	}
	start(interval){
		this.interval = interval || this.interval || 1000
		this.stop()
		this.intervalID = setInterval(() => {
			this.updaters.forEach((updater, id) => {
				Promise.resolve( updater.getValue() ).then(val =>  {
					if(updater.onChange && val != this.requests[id]){
						this.requests[id] = val
						updater.onChange(val)
					}
				})
			})
		}, this.interval);
	}
	stop(){ clearInterval(this.intervalID) }
	clear(){ this.updaters = []}
	push(getValue, onChange){ this.updaters.push({getValue, onChange}) }
}

const handlers = new class {
	constructor(){
		this.clear()
	}
	create(key, handler){
		if(this.handlers.get(key)) throw "handler exists"
		this.handlers.set(key, handler)
	}
	clear(){
		this.handlers = new Map()
	}
	get(key){
		const clz = this
		return function (){
			return (clz.handlers.get(key) || function() {
				throw `there are no such handler ${key}`
			}).apply(this, arguments)
		}
	}
}

if(ethereum) {
	const web3 = new Web3(ethereum)
	ethereum.autoRefreshOnNetworkChange = false
	const timeoutID = setTimeout(() => {
		window.location.reload()
	}, 1000)
	web3.eth.getAccounts().then( result => {
		clearTimeout(timeoutID)
		changeAccountsHandler(result)
		ethereum.on('accountsChanged', changeAccountsHandler )
	})
	document.querySelector('.connect--metamask')
		.addEventListener('click', enableEhereum)

} else {
	document.querySelector('.pop-up').classList.add('open')
}



const showLoan = window.showLoan = function(_id){
	const [token, id] = _id.split('_')
	const Borrow = contracts['Borrow'+token]
	const Erc20 = contracts[token]

	const select = document.querySelector('#loan-select .select')
	const option = select.querySelector(`.select__content .select__elem[data-loan-id=${_id}]`)
	const selected = document.importNode(option, true)
	selected.classList.remove('selected')
	select.dataset.selected = _id
	select.querySelector('.select__selected').innerHTML = ""
	select.querySelector('.select__selected').appendChild(selected)
	select.querySelectorAll('.select__content .select__elem').forEach(x => x.classList.remove("selected"))
	option.classList.add("selected")
	select.classList.remove("open")
	document.forms['loan-repay'].rebuild()
	document.forms['collateral-topup'].rebuild()
	document.querySelector('.overlay').classList.remove('open');
	document.querySelector('.loans-history').classList.remove('open');
	document.querySelectorAll('.overlay-dyn').forEach(x => document.body.removeChild(x))
	document.getElementById('state-line').dataset.status = 'waiting'
	document.querySelectorAll('[data-type=active-loan-info]').forEach(
		x=>x.classList.add('hide')
	)
	const repayHisoryContainer = document
		.querySelector('.repay-content__history--repay .history-transactions')
	const collateralHisoryContainer = document
		.querySelector('.collateral-content__history--withdraw .history-transactions')
	repayHisoryContainer.innerHTML = null
	collateralHisoryContainer.innerHTML = null

	Borrow.getPastEvents('LoanRepayment',{
		filter: {id},
		fromBlock: 0
	})
	.then(arr => arr.forEach(event => {
		const {interestAmount, repaymentAmount} = event.returnValues
		const amount = ((-interestAmount - repaymentAmount) / 1e18).toFixed(2)
		const hash = event.transactionHash
		const row = templates.get('history-transaction')
		params.web3.eth.getBlock(event.blockNumber)
			.then(x => new Date(x.timestamp * 1000).toMyString() )
			.then(taken => row.querySelector('[data-attr=time]').innerText = taken)
		row.querySelector('[data-attr=tx]').innerText = hash 
		row.querySelector('[data-attr=tx]').href = {
			1: `https://etherscan.io/tx/${hash}`,
			3: `https://ropsten.etherscan.io/tx/${hash}`
		}[params.chainID] 
		row.querySelector('[data-attr=amount]').innerText = amount 
		row.querySelector('[data-attr=amount]').dataset.currency = token 
		row.dataset.state = 'success'
		repayHisoryContainer.prepend(row)
	}))

	Promise.all([
		Borrow.methods.loan(id).call(),
		Borrow.methods.interestAmount(id).call(),
		Borrow.methods.lastRate().call(),
		Erc20.methods.balanceOf(params.address).call()
	])
	.then(([loan, interest, apy, balance]) => {
		const [collateralToken, BTC] = Object.entries(contracts)
			.find(x=>x[1]._address == loan.collateralToken)
		const security = (loan.collateralAmount * params.lastPrice * 1e4 / (+interest + loan.loanAmount)).toFixed(2)
		const amount = params.loan_issue.get(_id).returnValues.amount
		const wth = document.querySelector('.box-withdraw-repay-collateral')
		wth.dataset.repay = wth.dataset.collateral = loan.state == 1 ? 1 : 2
		wth.classList.remove('hide')
		if(loan.state == 1) document.querySelector('.w-r-loan-deals-box')
			.classList.remove('hide')
		document.querySelectorAll('[data-type=active-loan-info] .security-view')
			.forEach(sv => 
				setSecurity(security, loan.state, sv)
			)
		document.querySelector('[data-attr=loan-duration]').innerText =
			((Date.now() / 1000 - loan.taken) / 3600 / 24).toFixed()
		document.querySelector('[data-attr=liquidation-price]').innerText = 
			(1.1*(loan.loanAmount - -interest) / 1e10 / loan.collateralAmount ).toFixed(2)
		document.querySelectorAll('[data-type=loan-debt]').forEach( x=>{
			x.innerText = ((loan.loanAmount - -interest) / 1e18).toFixed(4)
			x.dataset.currency = token
		})
		document.querySelectorAll('[data-attr=loan-interest]').forEach(x => {
			x.innerText = interest / 1e18
			x.dataset.currency = token
		})
		document.querySelectorAll('[data-attr=changed-interest]').forEach(x => {
			x.dataset.currency = token
		})
		document.querySelectorAll('[data-attr=SBTC-amount]')
			.forEach(output => {
				output.innerText = (loan.collateralAmount / 1e8).toFixed(4)
				output.dataset.currency = collateralToken
			})
		document.getElementById('state-line').dataset.status =
				loan.state == 2 ? 5 :
				loan.loanAmount != amount ? 4 :3
		document.forms['loan-repay'].addEventListener('submit', function(e){
			e.preventDefault()
			const amount = this.amount.value.toBigIntString(18)
			this.submit.classList.add('loading')
			const row = templates.get('history-transaction')
			approve(Erc20, params.address, Borrow._address, amount)
				.then(() => Borrow.methods.repay(id, amount).send( (err, hash) => {
					if(!err){
						this.reset() 
						row.querySelector('[data-attr=time]').innerText = new Date().toMyString() 
						row.querySelector('[data-attr=tx]').innerText = hash 
						row.querySelector('[data-attr=tx]').href = {
							1: `https://etherscan.io/tx/${hash}`,
							3: `https://ropsten.etherscan.io/tx/${hash}`
						}[params.chainID] 
						row.querySelector('[data-attr=amount]')
							.innerText = (-amount / 1e18).toFixed(2)
						row.querySelector('[data-attr=amount]').dataset.currency = token 
						row.dataset.state = 'loading'
						repayHisoryContainer.prepend(row)
					}
					this.submit.classList.remove('loading')
				}))
				.then(tx => {
					console.log('tx', tx)
					if(select.dataset.selected == `${token}_${id}`){
						row.dataset.state = 'success'
						repayHisoryContainer.prepend(row)
					}
				})
		})
		document.forms['collateral-topup'].addEventListener('submit', function(e){
			e.preventDefault()
			const amount = this.amount.value.toBigIntString(8)
			this.submit.classList.add('loading')
			const row = templates.get('history-transaction')
			approve(BTC, params.address, Borrow._address, amount)
				.then(() => Borrow.methods.replenishCollateral(id, amount).send( (err, hash) => {
					if(!err){
						this.reset() 
						row.querySelector('[data-attr=time]').innerText = new Date().toMyString() 
						row.querySelector('[data-attr=tx]').innerText = hash 
						row.querySelector('[data-attr=tx]').href = {
							1: `https://etherscan.io/tx/${hash}`,
							3: `https://ropsten.etherscan.io/tx/${hash}`
						}[params.chainID] 
						row.querySelector('[data-attr=amount]')
							.innerText = (-amount / 1e8).toFixed(8)
						row.querySelector('[data-attr=amount]').dataset.currency = collateralToken 
						row.dataset.state = 'loading'
						collateralHisoryContainer.prepend(row)
					}
					this.submit.classList.remove('loading')
				}))
				.then(tx => {
					console.log('tx', tx)
					if(select.dataset.selected == `${token}_${id}`){
						row.dataset.state = 'success'
						collateralHisoryContainer.prepend(row)
					}
				})
		})
		document.forms['loan-repay'].amount.parentElement.dataset.currency = token
		document.forms['collateral-topup'].amount.parentElement.dataset.currency = collateralToken
		document.querySelector('[data-attr=changed-interest]').innerText =
			document.querySelector('[data-attr=loan-daily-rate]').innerText =
				(loan.loanAmount / 1e18 * apy / 1e9).toFixed(6)
		

		document.forms['collateral-topup'].amount.onkeyup = 
			document.forms['collateral-topup'].amount.onchange = function (){
				const collateralAmount = +loan.collateralAmount + this.value * 1e8
				const security = (collateralAmount * params.lastPrice * 1e4 / (+interest + loan.loanAmount)).toFixed(2)
				setSecurity(security, loan.state, 
					wth.querySelector('[data-attr=riskAfterTopUp] .security-view'))
			}
		document.forms['loan-repay'].amount.onkeyup = 
			document.forms['loan-repay'].amount.onchange = function (){

				const sub = new BN(loan.loanAmount)
					.sub(new BN(this.value.toBigIntString(18)))
					.mul(new BN(apy))
					.div(new BN(1e9))
					.toString() / 1e18

				document.querySelector('[data-attr=changed-interest]')
					.innerText = sub > 0 ? sub.toFixed(6) :0
			} 
			Borrow.getPastEvents('LoanIssued',{
				filter: {id},
				fromBlock: 0
			})
			.then(arr => arr.forEach(event => {
				const {amount} = event.returnValues
				const hash = event.transactionHash
				const row = templates.get('history-transaction')
				params.web3.eth.getBlock(event.blockNumber)
					.then(x => new Date(x.timestamp * 1000).toMyString() )
					.then(taken => row.querySelector('[data-attr=time]').innerText = taken)
				row.querySelector('[data-attr=tx]').innerText = hash 
				row.querySelector('[data-attr=tx]').href = {
					1: `https://etherscan.io/tx/${hash}`,
					3: `https://ropsten.etherscan.io/tx/${hash}`
				}[params.chainID] 
				row.querySelector('[data-attr=amount]').innerText = (amount / 1e18).toFixed(2) 
				row.querySelector('[data-attr=amount]').dataset.currency = token 
				row.dataset.state = 'success'
				repayHisoryContainer.append(row)
			}))
			Borrow.getPastEvents('CollateralReplenishment',{
				filter: {id},
				fromBlock: 0
			})
			.then(arr => arr.forEach(event => {
				const {amount, token} = event.returnValues
				const hash = event.transactionHash
				const row = templates.get('history-transaction')
				params.web3.eth.getBlock(event.blockNumber)
					.then(x => new Date(x.timestamp * 1000).toMyString() )
					.then(taken => row.querySelector('[data-attr=time]').innerText = taken)
				row.querySelector('[data-attr=tx]').innerText = hash 
				row.querySelector('[data-attr=tx]').href = {
					1: `https://etherscan.io/tx/${hash}`,
					3: `https://ropsten.etherscan.io/tx/${hash}`
				}[params.chainID] 
				row.querySelector('[data-attr=amount]').innerText = (-amount / 1e8).toFixed(8) 
				row.querySelector('[data-attr=amount]').dataset.currency = collateralToken 
				row.dataset.state = 'success'
				collateralHisoryContainer.prepend(row)
			}))
			.then(() => Borrow.getPastEvents('CollateralReturned',{
				filter: {id},
				fromBlock: 0
			}))			
			.then(arr => arr.forEach(event => {
				const {collateralAmount, token} = event.returnValues
				const hash = event.transactionHash
				const row = templates.get('history-transaction')
				params.web3.eth.getBlock(event.blockNumber)
					.then(x => new Date(x.timestamp * 1000).toMyString() )
					.then(taken => row.querySelector('[data-attr=time]').innerText = taken)
				row.querySelector('[data-attr=tx]').innerText = hash 
				row.querySelector('[data-attr=tx]').href = {
					1: `https://etherscan.io/tx/${hash}`,
					3: `https://ropsten.etherscan.io/tx/${hash}`
				}[params.chainID] 
				row.querySelector('[data-attr=amount]').innerText = (collateralAmount / 1e8).toFixed(8) 
				row.querySelector('[data-attr=amount]').dataset.currency = collateralToken 
				row.dataset.state = 'success'
				collateralHisoryContainer.prepend(row)
			}))
	})

}

function start([address, web3, chainID]){
	params.address = address
	params.loan_issue = new Map()
	params.chainID = chainID
	params.web3 = web3
	console.log('connected with:', address)
	const loanTypes = ['DAI']
	const collateralTypes = ['testBTC']
	document.querySelector('.loans-history__container').innerHTML = null
	document.querySelector("#loan-select .select__content").innerHTML = null
	updater.clear()
	handlers.clear()
	event_reduplicator.clear()
	while(subsciptions.length) subsciptions.pop().unsubscribe()
	
	const {Price} = window.contracts = Object.keys(info)
		.reduce((r, x)=> {
			r[x] = new web3.eth.Contract(info[x].ABI, info[x][chainID],{from: address, gasPrice:20000000000})
			return r
		},{})

	loanTypes.forEach(type =>{
		const Borrow = contracts[`Borrow${type}`]
		const Lend = contracts[`Lend${type}`]
		updater.push(() => Lend.methods.getPoolBalance().call(),
			value => {
				params['poolBalance'+type] = value
				const max = Math.floor(value / 1e16) / 1e2
				const el = document.getElementById('loan-amount')
				el.placeholder = el.dataset.placeholder + max
				el.max = max	
				handlers.get('loan-params-recount').call()				
			})
		updater.push(() => Price.methods.latestAnswer().call(),
			value => {
				params.lastPrice = value
				console.log("btc price:",value / 1e8)	
				handlers.get('loan-params-recount').call()	
				document.querySelectorAll('[data-attr=btc-price]')
					.forEach(x => x.innerText = (value / 1e8).toFixed(2) )
			})
		updater.push(() => Borrow.methods.lastRate().call(), rate => {
			const apr = params['apr'+type] = (rate * 365 / 1e7).toFixed(2)
			document.querySelectorAll('[data-attr=apr]')
				.forEach(x => x.innerText = apr)
			handlers.get('loan-params-recount').call()	
		})

		document.querySelector('.pop-up').classList.remove('open')
		document.querySelectorAll('[data-type=account]').forEach(x=>{
			x.innerText = address
		})
		handlers.create('loan-submit', function (e){
			e.preventDefault()
			this.classList.add('confirm')
			delete document.getElementById('state-line-take').dataset.status 
			document.querySelector('.consent__cansel-box').classList.remove('hide')
		})
		handlers.create('loan-cancel', function (e){
			document.forms.loan.classList.remove('confirm')
		})
		handlers.create('loan-params-recount', () => {
			const {lastPrice} = params
			const apr = params['apr'+type]
			const poolBalance = params['poolBalance'+type]
			const amount = parseFloat(document.forms.loan.amount.value.toString()) || (poolBalance / 1e18)
			const security = $("#security-range").data('from')
			const requiredCollateral = (Math.ceil(amount * security / lastPrice * 1e10) /10000).toFixed(4)
			document.getElementById('loan-amount-2').innerText = amount
			document.getElementById('collateral-amount-2').innerText = requiredCollateral
			document.getElementById('required-collateral').innerText = requiredCollateral
			document.getElementById('daily-interest').innerText = 
				(amount * apr / 36500).toFixed(4)
			document.getElementById('daily-interest').dataset.currency = 
				document.forms.loan.loan_token.value
			document.getElementById('required-collateral').dataset.currency = 
				document.forms.loan.collateral_token.value
			document.getElementById('collateral-amount-2').dataset.currency = 
				document.forms.loan.collateral_token.value
			document.getElementById('loan-amount-2').dataset.currency = 
				document.forms.loan.loan_token.value
		})
		handlers.create('loan-start-process',function(){
			const {lastPrice} = params
			const amount = document.forms.loan.amount.value.toBigIntString(18)
			const security = $("#security-range").data('from')
			const loanToken = document.forms.loan.loan_token.value
			const collateral = new BN(amount)
				.mul(new BN(security))
				.div(new BN(lastPrice))
				.div(new BN(1e4))
				.add(new BN(1))
				.toString()
			const _BTC = contracts[document.forms.loan.collateral_token.value]
			const _Borrow = contracts['Borrow'+loanToken]
			this.classList.add('loading')
			this.disabled = true
			document.querySelector('.consent__cansel-box').classList.add('hide')
			document.getElementById('js-take-loan-error-box-js')
				.classList.add('hide')
			document.getElementById('state-line-take').dataset.status = 'waiting'
			approve(_BTC, address, _Borrow._address, collateral)
				.then(()=>
					document.getElementById('state-line-take').dataset.status = 1
				)
				.then(() => _Borrow.methods.borrow(amount,collateral,_BTC._address)
					.send((err,y)=>{
						if(err){
							document.getElementById('js-take-loan-error-box-js')
								.classList.remove('hide')
							document.querySelector('.consent__cansel-box')
								.classList.remove('hide')
							this.classList.remove('loading')
							this.disabled = false
						} else {
							document.getElementById('state-line-take').dataset.status = 2
						}
					}) 
				)
				.then(tx => {
					document.forms.loan.classList.remove('confirm')
					document.querySelector('.consent__cansel-box').classList.add('hide')
					const id = `${loanToken}_${tx.events.LoanIssued.returnValues.id}`
					new Promise(function waitForCardDrawing(resolve, reject){
						const option = document.querySelector(`.select__elem[data-loan-id=${id}]`)
						if(option){
							option.click()	
							openSection('withdraw-repay')
							resolve()
						} else setTimeout(waitForCardDrawing, 300, resolve, reject)
					})
					document.getElementById('state-line-take').dataset.status = 3
					this.classList.remove('loading')
					this.disabled = false
				})
		})

		subsciptions.push(
			Borrow.events.LoanRepayment({fromBlock:'latest', filter:{borrower:address}}, (err, event) => {
				if(event_reduplicator.check(event)) return;
				const {id, interestAmount, repaymentAmount} = event.returnValues



				Promise.all([
					Borrow.methods.loan(id).call(),
					Price.methods.latestAnswer().call()
				]).then(([loan, price]) => {
					if(loan.borrower.toLowerCase() != address.toLowerCase()) return false;
					const interest = 0
					const container = document.querySelector('.loans-history__container')
					const card = container.querySelector(`[data-loan-id=${type}_${id}]`)
					const security = (loan.collateralAmount * price * 1e4 / loan.loanAmount).toFixed(2)
					card.dataset.status = loan.state == 2 ? 5 : 4
					card.querySelector('[data-prop=collateral]').innerText = (loan.collateralAmount / 1e8).toFixed(8)		
					card.querySelector('[data-prop=interest]').innerText = 0
					
					document.getElementById('state-line').dataset.status =
							loan.state == 2 ? 5 : 4

					setSecurity( security, loan.state, card.querySelector('.security-view') )
					if(loan.state != 1){
						container.removeChild(card)
						let next = container.firstElementChild
						const status = loan.state == 1
						while(
							next && (
								(next.dataset.status < 5) > status ||
								(next.dataset.status < 5) == status &&
								(next.dataset.taken > card.dataset.taken)
							)
						) next = next.nextElementSibling
						if(next) container.insertBefore(card, next)
						else container.appendChild(card)
					}



					const select = document.querySelector('#loan-select .select')
					const selectContent = document.querySelector("#loan-select .select__content")

					select.querySelectorAll(`[data-loan-id=${type}_${id}]`)
						.forEach(option => {
							option.dataset.state = loan.state == 2 ? 5 : 4 
							setSecurity( security, loan.state, option.querySelector('.security-view') )
						})

					if(loan.state != 1){
						const option = selectContent.querySelector(`[data-loan-id=${type}_${id}]`)
						selectContent.removeChild(option)
						let next = selectContent.firstElementChild
						const status = loan.state == 1
						while(
							next && (
								(next.dataset.state < 5) > status ||
								(next.dataset.state < 5) == status &&
								(next.dataset.taken > option.dataset.taken)
							)
						) next = next.nextElementSibling
						if(next) selectContent.insertBefore(option, next)
						else selectContent.appendChild(option)
					}
					console.log('test')
					if(select.dataset.selected == `${type}_${id}`){
						console.log('repay', event)
						document.querySelectorAll('[data-type=loan-debt]').forEach(
							x => x.innerText = (loan.loanAmount / 1e18).toFixed(4)
						)
						const security = (loan.collateralAmount * params.lastPrice * 1e4 / (+interest + loan.loanAmount)).toFixed(2)
						const wth = document.querySelector('.box-withdraw-repay-collateral')
						wth.dataset.repay = wth.dataset.collateral = loan.state == 1 ? 1 : 2
						wth.classList.remove('hide')
						if(loan.state != 1) document.querySelector('.w-r-loan-deals-box')
							.classList.add('hide')
						document.querySelectorAll('[data-type=loan-debt]').forEach( x=>{
							x.innerText = ((loan.loanAmount) / 1e18).toFixed(4)
						})
						document.querySelectorAll('[data-type=active-loan-info] .security-view')
							.forEach(sv => 
								setSecurity(security, loan.state, sv)
							)
						document.querySelector('[data-attr=liquidation-price]').innerText = 
							(1.1*(loan.loanAmount) / 1e10 / loan.collateralAmount ).toFixed(2)
		
					}
				})
			})
		)
		subsciptions.push(
			Borrow.events.CollateralReplenishment({fromBlock:'latest'}, (err,event,z) => {
				if(event_reduplicator.check(event)) return;
				const {id, amount} = event.returnValues
				Promise.all([
					Borrow.methods.loan(id).call(),
					Borrow.methods.interestAmount(id).call(),
					Price.methods.latestAnswer().call()
				])
				.then(([loan, interest, price]) => {
					if(loan.borrower.toLowerCase() != address.toLowerCase()) return false;
					const container = document.querySelector('.loans-history__container')
					const card = container.querySelector(`[data-loan-id=${type}_${id}]`)
					if(!card) return false;
					const security = (loan.collateralAmount * price * 1e4 / (loan.loanAmount - -interest) ).toFixed(2)
					card.dataset.status = loan.state == 2 ? 5 : 4
					card.querySelector('[data-prop=collateral]').innerText = (loan.collateralAmount / 1e8).toFixed(8)		
					card.querySelector('[data-prop=interest]').innerText = interest
						
					setSecurity( security, loan.state, card.querySelector('.security-view') )
						
					const select = document.querySelector('#loan-select .select')
					select.querySelectorAll(`[data-loan-id=${type}_${id}]`)
						.forEach(option => {
							option.dataset.state = loan.state == 2 ? 5 : 4 
							setSecurity( security, loan.state, option.querySelector('.security-view') )
						})

					if(select.dataset.selected == `${type}_${id}`){
						document.querySelectorAll('[data-type=active-loan-info] .security-view')
							.forEach(sv => 
								setSecurity(security, loan.state, sv)
							)
						document.querySelectorAll('[data-attr=SBTC-amount]')
							.forEach(output => {
								output.innerText = (loan.collateralAmount / 1e8).toFixed(4)
							})
						document.querySelector('[data-attr=liquidation-price]').innerText = 
							(1.1*(loan.loanAmount - -interest) / 1e10 / loan.collateralAmount ).toFixed(2)
		
					}
				})
			})
		)
		subsciptions.push(
			Borrow.events.LoanIssued({fromBlock:0, filter:{borrower:address}}, (err,y,z) => {
				if(event_reduplicator.check(y)) return;
				const {id, borrower, amount, collateral} = y.returnValues
				params.loan_issue.set(`${type}_${id}`, y)

				Promise.all([
					Borrow.methods.loan(id).call(),
					web3.eth.getBlock(y.blockNumber),
					Borrow.methods.interestAmount(id).call(),
					Price.methods.latestAnswer().call()
				]).then(([loan, block, interest, price]) => {
					const [collateralToken, BTC] = Object.entries(contracts)
						.find(x=>x[1]._address == loan.collateralToken)
					params.lastPrice = price
					const card = templates.get('loans-history-card')
					const security = (loan.collateralAmount * price * 1e4 / (+interest + loan.loanAmount)).toFixed(2)
					card.querySelector('[data-prop=amount]').dataset.currency = type
					card.querySelector('[data-prop=amount]').innerText = (amount / 1e18).toFixed(2)
					card.dataset.loanId = `${type}_${id}`
					card.dataset.taken = block.timestamp
					card.dataset.status = 
						loan.state == 2 ? 5 :
						loan.loanAmount != amount ? 4 :3
					card.querySelector('[data-prop=taken]').innerText =
						new Date(block.timestamp * 1e3).toMyString()

					card.querySelector('[data-prop=collateral]').innerText = (loan.collateralAmount / 1e8).toFixed(8)		
					card.querySelector('[data-prop=collateral]').dataset.currency = collateralToken		
					card.querySelector('[data-prop=interest]').dataset.currency = type
					card.querySelector('[data-prop=interest]').innerText = interest / 1e18		
					setSecurity( security, loan.state, card.querySelector('.security-view') )

					{
						const container = document.querySelector('.loans-history__container')
						let next = container.firstElementChild
						const status = loan.state == 1
						while(
							next && (
								(next.dataset.status < 5) > status ||
								(next.dataset.status < 5) == status &&
								(next.dataset.taken > block.timestamp)
							)
						) next = next.nextElementSibling
						if(next) container.insertBefore(card, next)
						else container.appendChild(card)
					} 


					card.querySelectorAll('.loan-history__header')
						.forEach(x=>x.addEventListener('click', function(){
							this.classList.toggle('show')
						}))

					
					const selectContent = document.querySelector("#loan-select .select__content")
					const option = templates.get('select-option')
					option.querySelector('[data-prop=amount]').innerText = 
						(amount / 1e18).toFixed(2)
					option.querySelector('[data-prop=taken]').innerText = 
						new Date(block.timestamp * 1e3).toMyString()
					option.dataset.taken = block.timestamp
					setSecurity( security, loan.state, option.querySelector('.security-view') )
					option.dataset.loanId = `${type}_${id}`
					
					option.dataset.state = 
						loan.state == 2 ? 5 :
						loan.loanAmount != amount ? 4 :3
					option.addEventListener('click', function(){
						showLoan(`${type}_${id}`)
					})
					{
						const status = loan.state == 1
						let next = selectContent.firstElementChild
						while(
							next && (
								(next.dataset.state < 5) > status ||
								(next.dataset.state < 5) == status &&
								(next.dataset.taken > block.timestamp)
							)
						) next = next.nextElementSibling
						if(next) selectContent.insertBefore(option, next)
						else selectContent.appendChild(option) 
					} 
					card.querySelector('[data-prop=goto-button]').addEventListener('click', ()=>{
						openSection('withdraw-repay')
						option.click()
					})
				})
			})
		)

	})
}

document.querySelector('[data-action=js-process-loan]')
	.addEventListener('click', handlers.get('loan-start-process'))
document.forms.loan.amount.addEventListener('change', handlers.get('loan-params-recount'));
document.forms.loan.amount.addEventListener('keyup', handlers.get('loan-params-recount'));
document.forms.loan.addEventListener('submit', handlers.get('loan-submit'));
document.forms.loan.querySelector('[data-action=cancel]').addEventListener('click', handlers.get('loan-cancel'));

document.querySelectorAll('[data-type=active-loan-info]').forEach(block => {
	block.querySelectorAll('.box-withdraw-repay-collateral__tab').forEach(tab => {
		tab.addEventListener('click', () => {
			block.dataset.action = tab.dataset.type
		})
	})
})



document.querySelectorAll('.select').forEach(select => {
	select.querySelector('.select__selected').addEventListener('click', function(event){
		if (select.querySelector('.select__content:empty')) return 

		document.querySelectorAll('.overlay-dyn').forEach(x => document.body.removeChild(x))
		const overlay = document.createElement("div")
		document.body.appendChild(overlay)
		overlay.classList.add("overlay-dyn")
		overlay.addEventListener('click', function(event){
			document.querySelectorAll(".select").forEach(x => x.classList.remove("open"))
			document.body.removeChild(overlay)
		})
		
		this.parentNode.classList.add("open")
		// document.querySelector('.overlay').classList.toggle("open")
	})
})

document.querySelectorAll(".lang-box").forEach(x => x.addEventListener('click', function(){
	if (document.querySelectorAll('.overlay-dyn'))
		document.querySelectorAll('.overlay-dyn').forEach(y => document.body.removeChild(y))
	const overlay = document.createElement("div")
	this.appendChild(overlay)
	overlay.classList.add("overlay-dyn")
	overlay.addEventListener('click', function(event){
		this.querySelector(".lang-dropdown").classList.remove("open")
		this.removeChild(overlay)
		event.stopPropagation();
	})

	this.querySelector(".lang-dropdown").classList.add("open")

}))

document.querySelectorAll('[data-page]').forEach(
	x => x.addEventListener('click', function(){
		openSection(this.dataset.page)
		document.querySelector('.overlay').classList.remove('open')
		document.querySelector('.sidebar').classList.remove('open')
	})
)

function openSection(str) {
	document.querySelectorAll(".section").forEach(x => x.classList.add("hide"));
	document.querySelectorAll(".menu-submenu__elem").forEach(x => x.classList.remove("selected"));

	document.querySelector(`.section--${str}`).classList.remove('hide');
	document.querySelector(`.menu-submenu__elem[data-page=${str}]`).classList.add("selected")
}

$("#security-range").ionRangeSlider({
    skin:'round',
    min: 140,
    max: 400,
    from: 170,
    step: 5,
    prettify: x =>`${x}%`,
    onChange: handlers.get('loan-params-recount')
});



(function (stop){
	if(stop) return;
	window.params = params
	window.BN = BN
	window.info = info
	window.updater = updater
	window.openSection = openSection
	window.subsciptions = subsciptions
})(false);
