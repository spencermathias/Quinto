shared = {
	makeDeck: function(){
		var deck = {comonity:['Gold','Silver','Home','Auto','Jewels','Stocks','Coins','Bank','Cards','Cash','Stamps','Piggys'], repeat:[1,2,3,4,5,6,7,8,9,10]};
		var values = {
			Gold:50,
			Silver:25,
			Home:20,
			Auto:15,
			Jewels:15,
			Stocks:10,
			Coins:10,
			Bank:10,
			Cards:5,
			Cash:5,
			Stamps:5,
			Piggys:5
		};
		
		return{
			Deck:deck,
			comonityValues:values
		};
	}
};

try {
	module.exports = shared;
} catch (err){
	console.log("you must be client side!");
}
