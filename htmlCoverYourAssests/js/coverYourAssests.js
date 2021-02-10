//events
var publicAddress = window.location.href;
var internalAddress = 'http://localhost:8080/';

const buttonType = {
	FACEUP:0,
	FACEDOWN:1
};

window.addEventListener('load', function() {
	var lastTouch = {x:0, y:0};
	
	var touchstartHandler = function(e) {
		lastTouch.x = e.touches[0].clientX;
		lastTouch.y = e.touches[0].clientY;
		//console.log(lastTouch);
		// if(!soundsAllowed){
			// console.log('allow sounds');
			// ding.play();
			// //ding.pause();
			// soundsAllowed = true;
		// }
	}

	var touchmoveHandler = function(e) {
		var touchX = e.touches[0].clientX;
		var touchY = e.touches[0].clientY;
		var dx = touchX - lastTouch.x;
		var dy = touchY - lastTouch.y;
		lastTouch.x = touchX;
		lastTouch.y = touchY;

		e.preventDefault(); //prevent scrolling, scroll shade, and refresh
		//board.x += dx;
		//board.y += dy;
		return;
	}

  document.addEventListener('touchstart', touchstartHandler, {passive: false });
  document.addEventListener('touchmove', touchmoveHandler, {passive: false });
  console.log('added');
  document.getElementById('gameBoard').addEventListener('click', checkClick);
  document.getElementById('title').addEventListener('click', titleFunction);
  document.getElementById('middle').addEventListener('click', allowAudio);
});

$('#submit').click(function(){
	var data = {
		message:$('#message').val()
	}
	socket.send(JSON.stringify(data));
	$('#message').val('');
	return false;
});

document.getElementById('title').style.color = '#ff0000'
function titleFunction(){
	//console.log('got in title function');
	let title = document.getElementById('title');
	//console.log(title.style.color);
	//console.log('rgb(255,0,0)');
	if ( title.style.color == 'rgb(255, 0, 0)' ){
		//console.log('ready is false');
		title.style.color = '#00ff00';
		socket.emit('ready', true);
	} else {
		//console.log('ready is true',title.style.color);
		title.style.color = '#ff0000';
		socket.emit('ready', false);
		
	}
	return false;
}

var soundsAllowed = false;
var ding = new Audio('../sounds/echoed-ding.mp3');
function allowAudio(){
	if (!soundsAllowed){
		ding.load();
		soundsAllowed = true;
	}
}

var selected = undefined;
var scoreIsValid = false;

var canvas = document.getElementById("gameBoard");
var ctx = canvas.getContext("2d");

class Button {
	constructor(x, y, width, height, text = "button", fillColor, outlineColor, textColor, textOutlineColor, fontSize = 50, textSlant = false){
		this.updateSize(x,y,width,height);
		this.fillColor = fillColor;
		this.outlineColor = outlineColor;
		this.textColor = textColor;
		this.textOutlinecolor = textOutlineColor;
		this.fontSize = fontSize;
		this.text = text;
		this.textSlant = textSlant;
		this.visible = true;
	}
	
	updateSize(x,y,width,height){
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.clickArea = {minX: x - width/2, minY: y - height/2, maxX: x + width/2, maxY: y + height/2};
	}
	
	draw(ctx){
		if(this.visible){
			ctx.save();
			ctx.fillStyle = this.fillColor;
			ctx.strokeStyle = this.outlineColor;
			roundRect(ctx, this.clickArea.minX, this.clickArea.minY, this.width, this.height, this.width/8, this.fillColor != undefined, this.outlineColor != undefined);

			//draw number
			ctx.font = '' + this.fontSize + "px Arimo" //Arial Black, Gadget, Arial, sans-serif";
			ctx.fillStyle = this.textColor;
			ctx.strokeStyle = this.textOutlineColor;
			ctx.translate(this.x, this.y);
			if(this.textSlant){
				ctx.rotate(Math.atan(this.height/this.width));
			}
			if(this.textColor != undefined){
				ctx.fillText(this.text,0,0);
			}
			if(this.textOutline != undefined){
				ctx.strokeText(this.text, 0, 0);
			}
			ctx.restore();
		}
	}
	
	click(){
		console.log("This button has not been overloaded yet!");
	}
}

class Card extends Button{
	constructor(x,y,text,player,cardNumb){
		super(x,y,canvas.width / 16,canvas.height / 8,text,'#ffffff',undefined,'Black',undefined,20,false);
		this.selected = false;
		this.player = player;
		this.cardNumb = cardNumb;
	}
	
	draw(ctx){
		if(this.visible){
			ctx.save();
			if(this.selected){
				ctx.fillStyle = '#ff1ac6';
				roundRect(ctx,this.clickArea.minX - 2.5, this.clickArea.minY - 2.5,this.width + 5,this.height + 5,(this.width + 5) / 8,true ,undefined);
			}
			ctx.fillStyle = this.fillColor;
			ctx.strokeStyle = this.outlineColor;
			roundRect(ctx, this.clickArea.minX, this.clickArea.minY, this.width, this.height, this.width/8, this.fillColor != undefined, this.outlineColor != undefined);

			//draw number
			ctx.font = '' + this.fontSize + "px Arimo" //Arial Black, Gadget, Arial, sans-serif";
			ctx.fillStyle = this.textColor;
			ctx.strokeStyle = this.textOutlineColor;
			ctx.translate(this.x, this.y);
			if(this.textSlant){
				ctx.rotate(Math.atan(this.height/this.width));
			}
			if(this.textColor != undefined){
				ctx.fillText(this.text,0,0);
			}
			if(this.textOutline != undefined){
				ctx.strokeText(this.text, 0, 0);
			}
			ctx.restore();
		}
	}
	
	click(){
		if(this == tilesDiscarded){
			socket.emit('picking',myTilesThatISomtimesLove);
		}else{
			if(findCardType(this) == 'cardInHand'){
				this.selected = !this.selected;
			}else{
				if(findCardType(this) == 'cardToSteal'){
					socket.emit('stealingCard',{player: this.player,cards: myTilesThatISomtimesLove});
				}
			}
		}
	}
}

class submitButton extends Button{
	constructor(){
		super(canvas.width / 2,(canvas.height / 4) * 3,canvas.width,canvas.height / 16,'Submit','Blue',undefined,'White',undefined,20,false)	;
	}
	
	click(){
		socket.emit('tradeInCards',myTilesThatISomtimesLove);
	}
}

class PlayersNames extends Button{
	constructor(x,y,text){
		super(x,y,1,1,text,undefined,undefined,'ffffff',undefined,20,false);
	}
}

class defendentAndOponentButton extends Button{
	constructor(x,y,text){
		super(x,y,canvas.width / 15,canvas.height / 30,text,'#66b3ff',undefined,'Black',undefined,20,false);
		this.visible = false;
	}
}

class stealingSlots extends Button{
	constructor(text){
		super(canvas.width / 4,canvas.height / 2,canvas.width / 16,canvas.height / 8,text,'White',undefined,'Black',undefined,20,false);
	}
	
	click(){
		socket.emit('defending',myTilesThatISomtimesLove);
	}
}

var myTilesThatISomtimesLove = [];
var deck = new Deck(shared.makeDeck().Deck);
var shapes = [[],[],[]];
var myTurn = false;
var userList = [];
var playersPiles = [];
var allPlayersNames = [];
var playersOponentButton = [];
var playersDefendentButton = [];
var biddingSlot = new stealingSlots('');
var myDefendentButton = new defendentAndOponentButton(canvas.width / 2,(canvas.height / 3) * 2,'Defendent');
var myPile = undefined;
var myOponentButton = new defendentAndOponentButton(canvas.width / 2,(canvas.height / 3) * 2,'Oponint');
var myUserName = undefined;
var myUserlistIndex = 0;
var myUserlistString = "";
var socket = io(publicAddress);
var tilesDiscarded = undefined;
var spectatorColor = "#444444";
var yourTurnColor = "#0000ff";
var placeholderColor = '#444444';
var SubmitButton = new submitButton();

socket.on('showBoard',function(data){
	//console.log(data.titleColor);
	$('#title').css('color', data.titleColor);
	$('#content').css('display', data.displayTitle);
	$('#gameBoard').css('display', data.displayGame);
	resizeCanvas();
});

socket.on('connect', function(){
	//get userName
	console.log("Connection successful!");
	if(localStorage.userName === undefined){
		changeName(socket.id);
	} else {
		socket.emit('userName', localStorage.userName);
	}
	
	if(localStorage.id !== undefined){
		socket.emit('oldId', localStorage.id);
	}
	localStorage.id = socket.id;
});

socket.on('userList',function(data){
	var userListString = '';
	userList = data;
	//console.log(data);
	resizeDrawings();
	for( var i = 0; i < data.length; i++ ){
		var header = 'div id="userListDiv'+ i + '"';
		var click = 'onclick="changeName(' + "'" + data[i].id + "'" + ')"';
		var color = ' style="color: ' + data[i].color + ';"'
		var string = '' + data[i].userName;
		var score = ' ' + data[i].score + 'K';
		var ender = '</div>';
		
		if(data[i].color != spectatorColor){
			string = string + " ";
			
			if(data[i].id == socket.id){
				if(soundsAllowed && !myTurn && data[i].color == yourTurnColor){
					myTurn = true;
					ding.play(); //play ding when it becomes your turn
				} 
				myTurn = data[i].color == yourTurnColor; //update old status
				
				myUserName = data[i].userName
				myUserlistIndex = i;
				myUserlistString = string;
			}
		}
		
		userListString = userListString + '<' + header + click + color + '>' + string + score + ender;
		//console.log( "player", data[i].userName, "myTurn", myTurn, "id", data[i].id, socket.id, "color", data[i].color, yourTurnColor);
	}
	document.getElementById('userlist').innerHTML = userListString;
	makePlayersPiles(socket);
	//console.table(data);
});

socket.on('addComitysToSideBar',function(){
	let sharedComonityValues = Object.keys(shared.makeDeck().comonityValues);
	let sharedComonityValuesLength = sharedComonityValues.length;
	//console.log(sharedComonityValues);
	for(let x = 0;x < sharedComonityValuesLength;x++){
		let thisValue = sharedComonityValues[x];
		//console.log(thisValue);
		console.log(shared.makeDeck().comonityValues[thisValue]);
		let sideBarValue = '<div style="color:#55ff00">' + thisValue + ' - ' + shared.makeDeck().comonityValues[thisValue] + 'K</div>';
		$('#comonities').append(sideBarValue);
	}
});

socket.on('cards',function(yourCards){
	myTilesThatISomtimesLove = [];
	//console.log(yourCards);
	for(var i = 0;i < yourCards.length;i++){
		var thisCard = deck.getProperties(yourCards[i]);
		var card = new Card(
			(canvas.width / (yourCards.length + 1)) * (i +1),
			(canvas.height / 8) * 7,
			thisCard.comonity,
			undefined,
			yourCards[i]
		);
		//console.log(card);
		myTilesThatISomtimesLove.push(card);
		card.visible = true;
		//console.log(canvas.width / yourCards.length * (yourCards.indexOf(card)));
	}
	//console.table(myTilesThatISomtimesLove);
	//console.table(tilesDiscarded);
	//console.log('got new data');
});

socket.on('discarded',function(cardYouSee){
	tilesDiscarded = undefined;
	console.log('the card discarded', cardYouSee);
	let card = deck.getProperties(cardYouSee);
	if(cardYouSee != null){
		tilesDiscarded = new Card(canvas.width / 2,canvas.height / 2,card.comonity);
	}else{
		tilesDiscarded = new Card(canvas.width / 2,canvas.height / 2,'');
	}
	//console.log('after card was made',tilesDiscarded);
});

socket.on("message",function(message){
	/*
		When server sends data to the client it will trigger "message" event on the client side , by 
		using socket.on("message") , one cna listen for the ,message event and associate a callback to 
		be executed . The Callback function gets the dat sent from the server 
	*/
	//console.log("Message from the server arrived")
	message = JSON.parse(message);
	//console.log(message); /*converting the data into JS object */
	
	$('#chatlog').append('<div style="color:'+message.color+'">'+message.data+'</div>'); /*appending the data on the page using Jquery */
	$('#response').text(message.data);
	$('#chatlog').scroll();
	$('#chatlog').animate({scrollTop: 1000000});
});

socket.on('gameEnd',function(){
	$('#comonities').empty();
});

function makePlayersPiles(socket){
	$('#peoplesTopPiles').empty();
	playersPiles = [];
	allPlayersNames = [];
	playersOponentButton = [];
	playersDefendentButton = [];
	myPile = undefined;
	myDefendentButton = new defendentAndOponentButton(canvas.width / 2,(canvas.height / 3) * 2,'Defendent');
	myOponentButton = new defendentAndOponentButton(canvas.width / 2,(canvas.height / 3) * 2,'Oponint');
	let alreadyFoundMe = false;
	for(let i = 0;i < userList.length;i++){
		if(userList[i].id == socket.id){
			//console.log('we got in here');
			alreadyFoundMe = true;
			let thisPileComonity = undefined;
			if(userList[i].thisLength != 0){
				for(let x = 0;x < userList[i].cardsPlayedDown.length;x++){
					if(deck.getProperties(userList[i].cardsPlayedDown[x]).comonity != 'Gold' && deck.getProperties(userList[i].cardsPlayedDown[x]).comonity != 'Silver'){
						thisPileComonity = deck.getProperties(userList[i].cardsPlayedDown[x]).comonity;
					}
				}
			}
			
			if(thisPileComonity != undefined){
				var card = new Card(
					canvas.width/2,
					canvas.width / 4,
					thisPileComonity
				);
				myPile = card;
				let gold = 0;
				let silver = 0;
				let comonity = 0;
				userList[i].cardsPlayedDown.forEach(function(card){
					if(deck.getProperties(card).comonity == 'Gold'){
						gold++;
					}
					if(deck.getProperties(card).comonity == 'Silver'){
						silver++;
					}
					if(deck.getProperties(card).comonity == thisPileComonity){
						comonity++;
					}
				});
				console.log(thisPileComonity)
				$('#peoplesTopPiles').append('<div id = ' + userList[i].id + ' style = "color:#ba1a6d">' + userList[i].userName + '</div>')
				$('#' + userList[i].id).append('<div style = "color:#0000ff">Gold - ' + gold + '</div>')
				$('#' + userList[i].id).append('<div style = "color:#0000ff">Silver - ' + silver + '</div>')
				$('#' + userList[i].id).append('<div style = "color:#0000ff">' + thisPileComonity + ' - ' + comonity + '</div>')
			}
			
			if(userList[i].oponint){
				myOponentButton.visible = true;
			}
			
			if(userList[i].defendent){
				myDefendentButton.visible = true;
			}
			if(userList[i].biddingPile.length == 0){
				biddingSlot = new stealingSlots('');
			}else{
				let biddingPileSlotComonity = undefined;
				userList[i].biddingPile.forEach(function(card){
					if(deck.getProperties(card).comonity != 'Gold' && deck.getProperties(card).comonity != 'Silver'){
						biddingPileSlotComonity = deck.getProperties(card).comonity;
					}
				});
				console.log(userList[i]);
				biddingSlot = new stealingSlots(biddingPileSlotComonity + ' ' + userList[i].biddingPile.length);
			}
		}else{
			let thisPileComonity = undefined;
			//console.log(userList[i]);
			if(userList[i].thisLength != 0){
				for(let x = 0;x < userList[i].cardsPlayedDown.length;x++){
					if(deck.getProperties(userList[i].cardsPlayedDown[x]).comonity != 'Gold' && deck.getProperties(userList[i].cardsPlayedDown[x]).comonity !=	'Silver'){
						thisPileComonity = deck.getProperties(userList[i].cardsPlayedDown[x]).comonity;
					}
				}
			}
			
			if(thisPileComonity != undefined){
				if(alreadyFoundMe){
					var card = new Card(
						(canvas.width / (userList.length)) * (i),
						(canvas.width / 5),
						thisPileComonity,
						userList[i].id
					);
					playersPiles.push(card);
				}else{
					var card = new Card(
						(canvas.width / (userList.length)) * (i + 1),
						(canvas.width / 5),
						thisPileComonity,
						userList[i].id
					);
					playersPiles.push(card);
				}
				let gold = 0;
				let silver = 0;
				let comonity = 0;
				userList[i].cardsPlayedDown.forEach(function(card){
					if(deck.getProperties(card).comonity == 'Gold'){
						gold++;
					}
					if(deck.getProperties(card).comonity == 'Silver'){
						silver++;
					}
					if(deck.getProperties(card).comonity == thisPileComonity){
						comonity++;
					}
				});
				$('#peoplesTopPiles').append('<div id = ' + userList[i].id + ' style = "color:#ba1a6d">' + userList[i].userName + '</div>')
				$('#' + userList[i].id).append('<div style = "color:#ffef00">Gold - ' + gold + '</div>')
				$('#' + userList[i].id).append('<div style = "color:#7e5f85">Silver - ' + silver + '</div>')
				$('#' + userList[i].id).append('<div style = "color:#00ff00">' + thisPileComonity + ' - ' + comonity + '</div>')
			}
			if(alreadyFoundMe){
				var playersNames = new PlayersNames(
					(canvas.width / (userList.length)) * (i),
					(canvas.width / 10),
					userList[i].userName + ' ' + userList[i].thisLength,
					userList[i].id
				);
				allPlayersNames.push(playersNames);
			}else{
				var playersNames = new PlayersNames(
					(canvas.width / (userList.length)) * (i + 1),
					(canvas.width / 10),
					userList[i].userName + ' ' + userList[i].thisLength,
					userList[i].id
				);
			}
			
			allPlayersNames.push(playersNames);
			
			if(userList[i].oponint){
				if(alreadyFoundMe){
					var oponint = new defendentAndOponentButton(
						(canvas.width / (userList.length)) * (i),
						canvas.height / 40,
						'Oponint'
					);
					oponint.visible = true;
				}else{
					var oponint = new defendentAndOponentButton(
						(canvas.width / userList.length) * (i + 1),
						canvas.height / 40,
						'Oponint'
					);
					oponint.visible = true;
				}
				playersOponentButton.push(oponint);
			}
			if(userList[i].defendent){
				if(alreadyFoundMe){
					var defendent = new defendentAndOponentButton(
						(canvas.width / (userList.length)) * (i),
						canvas.height / 13,
						'Defendent'
					);
					defendent.visible = true;
				}else{
					var defendent = new defendentAndOponentButton(
						(canvas.width / userList.length) * (i + 1),
						canvas.height / 13,
						'Defendent'
					);
					defendent.visible = true;
				}
				playersDefendentButton.push(defendent);
				console.log(userList[i].biddingPile);
			}
			if(userList[i].biddingPile.length == 0){
				biddingSlot = new stealingSlots('')
			}else{
				let cardComonity = undefined;
				userList[i].biddingPile.forEach(function(card){
					if(deck.getProperties(card).comonity != 'Silver' && deck.getProperties(card).comonity != 'Gold'){
						cardComonity = deck.getProperties(card).comonity;
					}
				});
				console.log(userList[i])
				biddingSlot = new stealingSlots(cardComonity + ' ' + userList[i].biddingPile.length);
			}
		}
	}
}

function findCardType(card){
	if(myTilesThatISomtimesLove.indexOf(card) == -1){
		return 'cardToSteal';
	}else{
		return 'cardInHand';
	}
}

function resizeCanvas(){
	canvas.width = window.innerWidth - $('#sidebar').width() - 50 - $('#leftSideBar').width();
	canvas.height = window.innerHeight - 2;
	//console.log('canvas resized to: ', canvas.width, canvas.height);
	resizeDrawings();
}

function resizeDrawings(){
	tileWidth = 100; //* window.devicePixelRatio;
	tileHeight = 50; //* window.devicePixelRatio;
	tileFontSize = 30; //* window.devicePixelRatio;
	/*board.x = canvas.width/2;
	board.y = canvas.height/2;
	board.rowThickness = tileHeight + 2*tilePadding;
	board.columnThickness = tileWidth + 2*tilePadding;*/
	
	for(var i = 0; i < myTilesThatISomtimesLove.length; i++){
		myTilesThatISomtimesLove[i].updateSize((canvas.width / (myTilesThatISomtimesLove.length + 1)) * (i +1),(canvas.height / 8) * 7,canvas.width / 16,canvas.height / 8);
	}
	
	if(tilesDiscarded != undefined){
		tilesDiscarded.updateSize(canvas.width / 2,canvas.height / 2,canvas.width / 16,canvas.height / 8);
	}
	
	makePlayersPiles(socket);
	SubmitButton.updateSize(canvas.width / 2,(canvas.height / 4) * 3,canvas.width,canvas.height / 16);
	biddingSlot.updateSize(canvas.width / 4,canvas.height / 2,canvas.width / 16,canvas.height / 8);
}

function changeName(userId){
	if(userId == socket.id){
		var userName = null;
		do{
			userName = prompt('Enter username: ');
			//console.log(userName);
			if ((userName == null || userName == "") && localStorage.userName !== undefined){
				userName = localStorage.userName;
			}
		} while (userName === null);
		localStorage.userName = userName;
		socket.emit("userName", localStorage.userName);
	}
}

function draw(){
	shapes = [[],[],[]]; //first object is top layer, second is middle, last is bottom layer
	ctx.textAlign="center";
	ctx.textBaseline = "middle";
	//console.log('draw: ', shapes );
	ctx.clearRect(0,0,canvas.width, canvas.height);
	
	//var radius = (Math.min(canvas.width, canvas.height-140)/2)-50;
	if (tilesDiscarded != undefined){
		shapes[0].push(tilesDiscarded);
	}
	shapes[0].push(SubmitButton);
	shapes[0].push(biddingSlot);
	//player tiles
	for(var i = 0; i < myTilesThatISomtimesLove.length; i++){
		//if(myTurn){
		/*if(scoreIsValid){
			myTiles[i].drawOutline(validPlayColor);
		} else {
			myTiles[i].drawOutline(invalidPlayColor);
		}*/
		 //else {
		//	myTiles[i].drawOutline('#444444'); //placeholder outline
		shapes[0].push( myTilesThatISomtimesLove[i] );//1st layer
		
	}
	shapes[0].push(myDefendentButton);
	shapes[0].push(myOponentButton);
	
	playersDefendentButton.forEach(function(Button){
		//console.log(Button)
		shapes[0].push(Button);
	});
	
	allPlayersNames.forEach(function(name){
		shapes[0].push(name);
	});
	
	playersOponentButton.forEach(function(Button){
		shapes[0].push(Button);
	});
	
	playersPiles.forEach(function(pile){
		shapes[0].push(pile);
	});
	//console.log(shapes);
	
	//selected outline
	
	//draw cards
	for( var i = shapes.length-1; i >= 0; i -= 1){
		//if(i==0 && shapes[0].length > 0){debugger;}
		for(var j = 0; j < shapes[i].length; j++){
			shapes[i][j].draw(ctx);
		}
	}
	setTimeout(draw, 100); //repeat
}

draw();

function checkClick(event){
	var foundClick = false;
	var i;
	var area;
	var offset = $('#gameBoard').position();
	var scale = {x: canvas.width / $('#gameBoard').width(), y: canvas.height/ $('#gameBoard').height()};
	//console.log('click', {x: event.clientX, y: event.clientY});
	//console.log('scale:', scale)
	var click = {x: event.clientX*scale.x - offset.left, y: event.clientY*scale.y - offset.top};
	//console.log('adjusted click: ', click);
	for( i = 0; i < shapes.length; i += 1){
		for(var j = 0; j < shapes[i].length; j++){
			if( shapes[i][j].clickArea ){
				area = shapes[i][j].clickArea;
				//console.log(area);
				if( click.x  < area.maxX){
					if( click.x > area.minX){
						if( click.y < area.maxY){
							if( click.y > area.minY){
								shapes[i][j].click()
								foundClick = true;
							}
						}
					}
				}
			} else {
				console.log('no click area');
			}
		}
		if(foundClick){break;}
	}
	if(!foundClick){
		selected = undefined;
	}
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke == 'undefined') {
	stroke = true;
  }
  if (typeof radius === 'undefined') {
	radius = 5;
  }
  if (typeof radius === 'number') {
	radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
	var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
	for (var side in defaultRadius) {
	  radius[side] = radius[side] || defaultRadius[side];
	}
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
	ctx.fill();
  }
  if (stroke) {
	ctx.stroke();
  }
}