//define point counter system



try{
	var Deck = require('./Deck.js');//shared deck class
} catch(err){
	console.log("you must be client side!");
}

shared = {
	//deck: new Deck({suit:['♥','♦','♣','♠'], number:['A','2','3','4','5','6','7','8','9','10','J','Q','K']})
};

try {
	module.exports = shared;
} catch (err){
	console.log("you must be client side!");
}
