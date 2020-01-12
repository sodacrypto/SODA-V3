require('ion-rangeslider');

ethereum.on('accountsChanged', function (accounts) {
  if(accounts.length > 0) start(accounts)
  else {
  	document.querySelectorAll('[data-type=account]').forEach(x=>{
		x.innerText = null
	})
  	document.querySelector('.pop-up').classList.add('open')
  }
})

$("#security-range").ionRangeSlider({
    skin:'round',
    min: 140,
    max: 400,
    from: 170,
    step: 5,
    prettify: x =>`${x}%`
})

document.querySelector('.connect-wallet--button').addEventListener('click', () => {
  document.querySelector('.pop-up').classList.add('open')
})

document.querySelector('.connect--metamask').addEventListener('click', () => {
	ethereum.enable()
})

document.querySelectorAll(".lang-box").forEach(x => x.addEventListener('click', function(){
	const thisElem = x
	if (document.querySelectorAll('.overlay-dyn'))
		document.querySelectorAll('.overlay-dyn').forEach(y => document.body.removeChild(y))
	const overlay = document.createElement("div")
	thisElem.appendChild(overlay)
	overlay.classList.add("overlay-dyn")
	overlay.addEventListener('click', function(event){
		thisElem.querySelector(".lang-dropdown").classList.remove("open")
		thisElem.removeChild(overlay)
		event.stopPropagation();
	})

	thisElem.querySelector(".lang-dropdown").classList.add("open")

}))


window.openSection = openSection

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

function start([address]){
	document.querySelector('.pop-up').classList.remove('open')
	document.querySelectorAll('[data-type=account]').forEach(x=>{
		x.innerText = address
	})
	console.log(address)
}

