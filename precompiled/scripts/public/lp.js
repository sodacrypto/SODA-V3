require('ion-rangeslider');


$("#security-range").ionRangeSlider({
    skin:'round',
    min: 140,
    max: 400,
    from: 170,  
    step: 5,
    prettify: x =>`${x}%`
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