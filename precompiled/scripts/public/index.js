require('ion-rangeslider');

const Web3 = require('web3')
const BN = Web3.utils.BN

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
	updater.clear()
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
	BTC:  require('../static/contracts/DeFiBTC.json'),
	Lend: require('../static/contracts/SODALend.json'),
	Borrow: require('../static/contracts/SODABorrow.json'),
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
				Promise.resolve( updater.getValue() )
					.then(val =>  {
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
	window.web3 = web3
	console.log(chainID)
	const {DAI, BTC, Lend, Borrow, Price} = window.contracts = Object.keys(info)
		.reduce((r, x)=> {
			r[x] = new web3.eth.Contract(info[x].ABI, info[x][chainID],{from: address})
			return r
		},{}) 
	updater.push(() => Lend.methods.getPoolBalance().call(),
		value => {
			const max = Math.floor(value / 1e16) / 1e2
			const el = document.getElementById('loan-amount')
			el.placeholder = el.dataset.placeholder + max
			el.max = max				
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
}



// document.querySelectorAll(".lang-box").forEach(x => x.addEventListener('click', function(){
// 	const thisElem = x
// 	if (document.querySelectorAll('.overlay-dyn'))
// 		document.querySelectorAll('.overlay-dyn').forEach(y => document.body.removeChild(y))
// 	const overlay = document.createElement("div")
// 	thisElem.appendChild(overlay)
// 	overlay.classList.add("overlay-dyn")
// 	overlay.addEventListener('click', function(event){
// 		thisElem.querySelector(".lang-dropdown").classList.remove("open")
// 		thisElem.removeChild(overlay)
// 		event.stopPropagation();
// 	})

// 	thisElem.querySelector(".lang-dropdown").classList.add("open")

// }))



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

document.querySelectorAll('.loan-history__header').forEach(x =>
	x.addEventListener('click', function(){
		x.classList.toggle('show')
	})
)

$("#security-range").ionRangeSlider({
    skin:'round',
    min: 140,
    max: 400,
    from: 170,
    step: 5,
    prettify: x =>`${x}%`
});



(function (stop){
	if(stop) return;
	window.BN = BN
	window.info = info
	window.updater = updater
	window.openSection = openSection
})(false);