require('ion-rangeslider');

const Web3 = require('web3')
const BN = Web3.utils.BN

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

const enableEhereum = () => {
	const web3 = new Web3(ethereum)
	Promise.all([
		ethereum.enable().then(x=> x[0]),
		web3,
		web3.eth.getChainId()
	]).then(start)
	ethereum.on('accountsChanged', changeAccountsHandler )
}

function changeAccountsHandler(accounts){
	if (accounts.length > 0) enableEhereum()
	else {
		document.querySelectorAll('[data-type=account]')
			.forEach(x => x.innerText = null)
		document.querySelector('.pop-up').classList.add('open')
	}
}

const params = {
	lastPrice:0
}
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
	})
	document.querySelector('.connect--metamask')
		.addEventListener('click', enableEhereum)

} else {
	document.querySelector('.pop-up').classList.add('open')
}








function start([address, web3, chainID]){
	document.querySelector('.loans-history__container').innerHTML = null
	updater.clear()
	handlers.clear()
	const {DAI, testBTC, LendDAI, BorrowDAI, Price} = window.contracts = Object.keys(info)
		.reduce((r, x)=> {
			r[x] = new web3.eth.Contract(info[x].ABI, info[x][chainID],{from: address})
			return r
		},{}) 
	updater.push(() => LendDAI.methods.getPoolBalance().call(),
		value => {
			params.poolBalance = value
			const max = Math.floor(value / 1e16) / 1e2
			const el = document.getElementById('loan-amount')
			el.placeholder = el.dataset.placeholder + max
			el.max = max	
			handlers.get('loan-params-recount').call()				
		})
	updater.push(() => Price.methods.latestAnswer().call(),
		value => {
			params.lastPrice = value / 1e8
			console.log("btc price:",params.lastPrice)	
			handlers.get('loan-params-recount').call()		
		})
	updater.push(() => BorrowDAI.methods.lastRate().call(), rate => {
		const apr = params.apr = (rate * 365 / 1e7).toFixed(2)
		document.querySelectorAll('[data-attr=apr]')
			.forEach(x => x.innerText = apr)
		handlers.get('loan-params-recount').call()	
	})
	function approve(token, owner, spender, amount){
		const max_amount = new BN(2).pow(new BN(256)).sub(new BN(1)).toString()
		return token.methods.allowance(owner, spender).call()
			.then(web3.utils.toBN)
			.then(x=>x.gte(new BN(amount)))
			.then( enough =>
				enough ? true : token.methods.approve(spender, max_amount).send()
			)
	}

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
		const {lastPrice, apr, poolBalance} = params
		const amount = document.forms.loan.amount.value || poolBalance / 1e18
		const security = $("#security-range").data('from')
		const requiredCollateral = (Math.ceil(amount * security / lastPrice * 100) /10000).toFixed(4)
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
		const {lastPrice, apr, poolBalance} = params
		const amount = (document.forms.loan.amount.value * 1e18).toFixed()
		const security = $("#security-range").data('from')
		const collateral = Math.ceil(amount * security / lastPrice / 1e12).toFixed()
		const _BTC = contracts[document.forms.loan.collateral_token.value]
		const _Borrow = contracts['Borrow'+document.forms.loan.loan_token.value]
		this.classList.add('loading')
		document.querySelector('.consent__cansel-box').classList.add('hide')

		document.getElementById('state-line-take').dataset.status = 'waiting'
		approve(_BTC, address, _Borrow._address, amount)
			.then(()=>
				document.getElementById('state-line-take').dataset.status = 1
			)
			.then(() => _Borrow.methods.borrow(address,amount,collateral,_BTC._address)
				.send(()=>document.getElementById('state-line-take').dataset.status = 2) 
			)
			.then(() => 
				document.getElementById('state-line-take').dataset.status = 3
			)
	})
	subsciptions.push(
		BorrowDAI.events.LoanIssued({fromBlock:0, filter:{borrower:address}}, (err,y,z) => {
			const {id, borrower, amount, collateral} = y.returnValues
			Promise.all([
				contracts.BorrowDAI.methods.loan(id).call(),
				web3.eth.getBlock(y.blockNumber),
				contracts.BorrowDAI.methods.interestAmount(id).call(),
				Price.methods.latestAnswer().call()
			]).then(([loan, block, interest, price]) => {
				const card = document.importNode(document.getElementById('js_template__loan').content.firstChild, true)
				card.querySelector('[data-prop=amount]').innerText = (amount / 1e18).toFixed(2)
				card.dataset.taken = block.timestamp
				card.dataset.status = 
					loan.state == 0 ? 5 :
					loan.loanAmount != amount ? 4 :3
				card.querySelector('[data-prop=taken]').innerText =
					new Date(block.timestamp * 1e3).toMyString()
				card.querySelector('[data-prop=collateral]').innerText = (loan.collateralAmount / 1e8).toFixed(8)		
				card.querySelector('[data-prop=interest]').innerText = interest / 1e18		
				card.querySelector('[data-prop=security]').innerText = 
					(loan.collateralAmount * price * 1e4 / (interest + loan.loanAmount)).toFixed(2) 		

				const container = document.querySelector('.loans-history__container')
				if(container.childElementCount == 0) container.appendChild(card)
				else {
					let cur = container.firstElementChild
					while(
						cur.nextElementSibling && 
						cur.dataset.taken > block.timestamp
					) cur = cur.nextElementSibling
					if(cur.dataset.taken > block.timestamp)
						container.appendChild(card)
					else container.insertBefore(card, cur)
				} 


				card.querySelectorAll('.loan-history__header')
					.forEach(x=>x.addEventListener('click', function(){
						this.classList.toggle('show')
					}))

			})
		})
	)
}
document.querySelector('[data-action=js-process-loan]')
	.addEventListener('click', handlers.get('loan-start-process'))
document.forms.loan.amount.addEventListener('change', handlers.get('loan-params-recount'));
document.forms.loan.amount.addEventListener('keyup', handlers.get('loan-params-recount'));
document.forms.loan.addEventListener('submit', handlers.get('loan-submit'));
document.forms.loan.querySelector('[data-action=cancel]').addEventListener('click', handlers.get('loan-cancel'));

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
})(false);