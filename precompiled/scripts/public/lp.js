require('ion-rangeslider');


$("#security-range").ionRangeSlider({
    skin:'round',
    min: 140,
    max: 400,
    from: 170,  
    step: 5,
    prettify: x =>`${x}%`
})