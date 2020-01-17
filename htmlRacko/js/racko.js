// button to get new tiles
// print new points to the chat log or make a grid showing all turn scores and total
// put chat log behind a button for mobile; only show the last message for a second

//events
var publicAddress = 'http://alanisboard.ddns.net:8080/';
var internalAddress = 'http://localhost:8080/';

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
		board.x += dx;
		board.y += dy;
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
	let title = document.getElementById('title')
	if ( title.style.color == 'rgb(255, 0, 0)' ){
		title.style.color = '#00ff00';
		socket.emit('ready', {ready: true});
	} else {
		title.style.color = '#ff0000';
		socket.emit('ready', {ready: false});
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

var tileWidth = 40 //* window.devicePixelRatio;
var tileHeight = 40 //* window.devicePixelRatio;
var tileFontSize = 30 //* window.devicePixelRatio;
var allTiles = new Deck(shared.cardDes);
var serverTiles = [];
var selected = undefined;
var scoreIsValid = false;
var lastSubmitPushed = undefined;

var canvas = document.getElementById("gameBoard");
var ctx = canvas.getContext("2d");
//console.log('ctx', ctx);
//console.log(canvas.width, canvas.height);

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
				ctx.fillText(this.text,,0);
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

class leftSidePannal{
	constructor(x,y,width,hight,fillColor,text){
		this.x = x;
		this.y = y;
		this.width = width;
		this.hight = hight;
		this.fillColor = fillColor;
		this.text = text;
	}
	draw(ctx)
		ctx.fillRect(this.x,this.y,this.width,this,hight);
		ctx.fillStyle = this.fillColor;
		ctx.font = '' + 30 + 'px Arimo'
		ctx.fillText(this.text,0,0)
	}
}

class confirmButtonTakeTop extends Button{
	constructor(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant){
		super(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant)
		this.visible = (text.length >= 0);
		this.highlightColor = "Magenta";
		this.selected = false;
	}
	draw(ctx){
		ctx.save();
		roundRect(ctx,this.x,this.y,this.width,this.hight,50,this.fillColor,this.outlineColor);
		ctx.fillStyle = this.highlightColor;
		ctx.restore();
		this.visible = false;
		
		ctx.font = '' + this.fontSize + 'px Arimo'
		ctx.fillText(this.text,0,0)
	}
	
	click(){
		lastSubmitPushed = takeTop;
		
	}
}

class confirmButtonTakeFaceDown extends Button{
	constructor(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant){
		super(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant)
		this.visible = (text.length >= 0);
		this.highlightColor = "Magenta";
		this.selected = false;
	}
	draw(ctx){
		ctx.save();
		roundRect(ctx,this.x,this.y,this.width,this.hight,50,this.fillColor,this.outlineColor);
		ctx.fillStyle = this.highlightColor;
		ctx.restore();
		this.visible = false;
		
		ctx.font = '' + this.fontSize + 'px Arimo'
		ctx.fillText(this.text,0,0)
	}
	
	click(){
		lastSubmitPushed = takeTop;
		
	}
}

class confirmButtonTakeFaceUp extends Button{
	constructor(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant){
		super(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant)
		this.visible = (text.length >= 0);
		this.highlightColor = "Magenta";
		this.selected = false;
	}
	draw(ctx){
		ctx.save();
		ctx.fillStyle = this.highlightColor;
		roundRect(ctx,this.x,this.y,this.width,this.hight,50,this.fillColor,this.outlineColor);
		ctx.restore();
		this.visible = false;
	}
	click(){
		socket.emit('takeFaceUpClicked');
	}
}

class Tile extends Button{
	constructor(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant){
		/*var text = -1;
		if(tileData.name != undefined){
			text = tileData.products.name
		}*/
		//super(x,y,width,height,text,defaultTileColor,'SteelBlue','Red',undefined,fontSize,true);
		super(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant)
		//this.tileData = tileData;
		this.visible = (text.length >= 0);
		this.highlightColor = "Magenta";
		this.selected = false;
	}
	
	drawOutline(color){
		this.highlightColor = color;
	}
	
	updateNumberAndText(cardNumber){
		/*this.tileData = tileData;
		if(tileData != undefined){
			this.text = this.tileData.products.name;
			this.visible = (this.text.length >= 0);*/
		//}
		console.log(this.cardNumber,'new',cardNumber);
		this.text = allTiles.getProperties(cardNumber).products.name;
		this.visible = (this.text.length >= 0);
		this.cardNumber = cardNumber;
	}
	
	draw(ctx){
		if(this.selected != false){
			ctx.save();
			ctx.fillStyle = this.highlightColor;
			roundRect(ctx, this.x-(this.width/2 + tilePadding), this.y-(this.height/2 + tilePadding), this.width+2*tilePadding, this.height+2*tilePadding, this.width/8,true, false);
			ctx.restore();
			//this.highlightColor = "";
		}
		super.draw(ctx);
	}
	
	click(){
		if (this.selected){
			tilesSelected++;
		}
		if (!this.selected){
			tilesSelected--;
		}
		console.log(this);
		this.selected = !this.selected;
		
		if (tilesSelected == 1){
			x = indexOf(
			socket.emit('switchCards',);
		}
	}
}

var tilesSelected = 0;

class MoveTile extends Tile	{
	constructor(tileData, x,y,width,height,fontSize){
		super(tileData, x,y,width,height,fontSize);
	}
	
	click(){
		if(selected != undefined){ //switch
			console.log("switch", selected.tileData, this.tileData);
			if(selected.tileData != undefined){
				var tempNumber = selected.tileData.number;
				var tempOwner = selected.tileData.owner;
				var tempId = selected.tileData.id;
				selected.updateData(this.tileData);
				this.updateData({owner: tempOwner, number: tempNumber, id: tempId})
				selected = undefined;
			} else {
				this.tileData = undefined;
			}
		} else { //select
			selected = this;
		}
		
		updatePlayValidity();
		//console.log("I am tile of number: " + this.tileData.number + " and Id: " + this.tileData.id, this);
	}
}

/*class tradeButton extends Tile{
	constructor(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant,userNumber,placeNumber){	
		super(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant);
		this.userNumber = userNumber;
		this.placeNumber = placeNumber;
	}
	
	checkVisibility(){
		//this.visible = (userList[this.userNumber].trades[this.placeNumber]>0);
		this.visible = false;
		console.log(this.userNumber);
		if ((playerTradeMatrix != undefined) && (playerTradeMatrix.length > this.userNumber)){
			for (let i = 0;i < playerTradeMatrix[this.userNumber].length;i++){
				let trade = playerTradeMatrix[this.userNumber][i];
				console.log(trade,this.placeNumber + 1);
				this.visible =(trade.length == this.placeNumber + 1);
			}
		}
	}
	
	click(){
		console.log('tradeButton',this.userNumber,this.placeNumber);
		socket.emit('tradeReady',this.userNumber,this.placeNumber);
	}
}

/*class bidButton extends Tile{
	constructor(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant,userNumber,placeNumber){	
		super(x,y,width,height,text,fillColor,outlineColor,textColor,textOutlineColor,fontSize,textSlant);
		this.userNumber = userNumber;
		this.placeNumber = placeNumber;
	}
	
	checkVisibility(){
		this.visible = userList[this.userNumber].bids[this.placeNumber]>0;
	}
	
	click(){
		console.log('bidButton',this.userNumber,this.placeNumber);
		let cardSelection = checkCardSelection();
		if (cardSelection != undefined){
			if (cardSelection.length == this.placeNumber + 1){
				socket.emit('attemptTrade',cardSelection,this.userNumber);
			}
			else console.log('number of selected cards is not correct');
		}
		else console.log('mixed commodity');
	}
}

class BiddingInterface{
	constructor(userNumber,y,textsize){
		this.user = userList[userNumber];
		this.y = y;
		this.receive = [];
		this.send = [];
		var nameWidth = ctx.measureText(userList[userNumber].userName).width;
		var x = (canvas.width/2)-(nameWidth/2)-(textsize/2)-(textsize*7);
		for (var i = 1; i <= 4; i++){
			let t = new tradeButton(x,y,textsize,textsize,String(i),'LightSeaGreen','#000000','#000000','#000000',textsize/2,false,userNumber,i-1);
			this.receive.push(t);
			x += textsize*2;
		}
		var x = (canvas.width/2)+(nameWidth/2)+(textsize/2)+(textsize*1);
		for (var i = 1; i <= 4; i++){
			let t = new bidButton(x,y,textsize,textsize,String(i),'#8888ff','#000000','#000000','#000000',textsize/2,false,userNumber,i-1);
			this.send.push(t);
			x += textsize*2;
		}
		this.updateVisibility();
	}
	
	addToShapes(shapeList){
		shapeList.push(this);
		shapeList.push.apply(shapeList,this.receive);
		shapeList.push.apply(shapeList,this.send);
	}
		
	updateVisibility(){
		for (let i = 0;i < this.receive.length;i++){
			this.receive[i].checkVisibility();
		}
		this.send.forEach((i)=>i.checkVisibility());
	}
	
	draw(ctx){
		//var textsize = 40;
		//var y = 0;
			//y = (index+1)*textsize*1.5;
			//this.receive.forEach((e)=> e.draw(ctx));
			//this.send.forEach((e)=> e.draw(ctx));
			ctx.save();
			ctx.font = '' + this.textsize + "px Arimo" //Arial Black, Gadget, Arial, sans-serif";
			ctx.fillStyle = '#000000';
			ctx.strokeStyle = '#000000';
			ctx.translate(canvas.width/2,this.y);
			//if(this.textSlant){
			//	ctx.rotate(Math.atan(this.height/this.width));
			//}
			ctx.fillText(this.user.userName,0,0);
			//var nameWidth = ctx.measureText(user.userName).width;
			//if(this.textOutline != undefined){
				//ctx.strokeText(this.text, 0, 0);
			//}
			ctx.restore();
			/*var x = (canvas.width/2)-(nameWidth/2)-(textsize/2)-(textsize*7);
			for (var i = 1; i <= 4; i++){
				shapes[0].push(new Button(x,y,textsize,textsize,i,'LightSeaGreen','#000000','#000000','#000000',textsize/2,false));
				x += textsize*2;
			}
			var x = (canvas.width/2)+(nameWidth/2)+(textsize/2)+(textsize*1);
			for (var i = 1; i <= 4; i++){
				shapes[0].push(new Button(x,y,textsize,textsize,i,'#8888ff','#000000','#000000','#000000',textsize/2,false));
				x += textsize*2;
			}*/
		//});
	}
}


class SubmitButton extends Button{
	constructor(){
		super(canvas.width/2, canvas.height-tileHeight-40, canvas.width, tileHeight,"SUBMIT",'#0000ff',undefined,'#ffffff',undefined,tileFontSize,false)
	}
	click(){
		if (tilesSelected == 0){
			socket.emit('cheakEndOfRound');
		}
		else{
			if(this.visible){
				let selected = tiles.selected;
				socket.emit('switchCards',selected)
				}
			}
		}
	}
}

/*class endRoundButton extends Button{
	constructor(){
		super(canvas.width/2, canvas.height-tileHeight-80, canvas.width, tileHeight,"SUBMIT",'#0000ff',undefined,'#ffffff',undefined,tileFontSize,false,)
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
		
	}
}
var clickToEndRound = new endRoundButton();

//clickToEndRound.x,clickToEndRound.y,clickToEndRound.width,clickToEndRound.hight
//checks all cards correct type and number
//returns undefined if not correct
var mismatchedCardsError = {message:'you can not trade more then one commodity'};
function checkCardSelection(){
	let type = undefined;
	let sendCards = [];
	try{
		myTiles.forEach((t)=>{
			//console.log(sendCards);
		if (t.selected){
			if (type == undefined){
				type = t.text;
				sendCards.push(t.cardNumber);
			}else if(t.text == type){
				sendCards.push(t.cardNumber);//TODO:include bull and bear
			}else{
				throw mismatchedCardsError;
			}
		}
	});
	return sendCards;
	} catch(e){
		console.error(e.message);
	}
	return undefined;
}

function getTileData( state ){
	var sendState = [];
	for(var row = 0; row < state.length; row++){
		var line = [];
		for(var col = 0 ; col < state[row].length; col++){
			line.push(state[row][col].tileData);
		}
		sendState.push(line);
	}
	return sendState;
}

class Board {
	constructor(x, y, rows, columns, rowThickness, columnThickness){
		this.x = x;
		this.y = y;
		this.rows = rows;
		this.columns = columns;
		this.rowThickness = rowThickness;
		this.columnThickness = columnThickness;
		this.borderColor = '#0000CD';
		this.backgroundColor = '#4682B4';
		this.lineColor = '#B0C4DE';
		this.lineWidth = 2;
		
	}
	
	updateFromServer(recievedBoardState){
		this.rows = recievedBoardState.length;
		if(recievedBoardState.length > 0){
			this.columns = recievedBoardState[0].length;
		}
		
		if(boardState.length != recievedBoardState.length || boardState[0].length != recievedBoardState[0].length){ //new boardState if different size
			boardState = [];
			if(recievedBoardState.length > 0 && recievedBoardState[0].length > 0){
				for(var row = 0; row < recievedBoardState.length; row++){
					var line = [];
					for(var col = 0; col < recievedBoardState[0].length; col++){
						line.push(new Tile(shared.newBlankTile(), 0, 0, tileHeight, tileWidth, tileFontSize));
					}
					boardState.push(line);
				}
			}
		}
		
		for(var row = 0; row < recievedBoardState.length; row++){
			for(var col = 0; col < recievedBoardState[0].length; col++){
				if(boardState[row][col].tileData.id != recievedBoardState[row][col].id){
					boardState[row][col].fillColor = newServerTileColor;
				} else {
					boardState[row][col].fillColor = defaultTileColor;
				}
				boardState[row][col].updateData(recievedBoardState[row][col]);
			}
		}
	}
	
	draw(ctx){
		if (this.rows > 0 && this.columns >0){
			ctx.save()
			var bh = this.rows*this.rowThickness;
			var bw = this.columns*this.columnThickness;
			//console.log(xPos, yPos, rows, columns, rowThickness, columnThickness)
			//console.log(xPos, yPos,bw, bh);
			var xMin = this.x - bw/2;
			var xMax = this.x + bw/2;
			var yMin = this.y - bh/2;
			var yMax = this.y + bh/2;
			
			//border
			ctx.fillStyle = this.borderColor;
			var border = Math.min(.01*bw, .01*bh);
			ctx.fillRect(xMin - border, yMin - border, bw + 2*border, bh + 2*border);
			//background
			ctx.fillStyle = this.backgroundColor;
			ctx.fillRect(xMin,yMin,bw, bh);
			//center marker
			ctx.fillStyle = this.lineColor;
			ctx.fillRect(this.x - 0.5*this.rowThickness, this.y - 0.5*this.columnThickness, this.columnThickness, this.rowThickness);
			//lines
			ctx.strokeStyle = this.lineColor;
			ctx.lineWidth = this.lineWidth;
			for (var x = xMin; x <= xMax; x += this.columnThickness) {
				ctx.moveTo(0.5 + x, 0.5 + yMin);
				ctx.lineTo(0.5 + x, 0.5 + yMax);
			}
			
			ctx.fillRect()
			
			for (var y = yMin; y <= yMax; y += this.rowThickness) {
				ctx.moveTo(0.5 + xMin, 0.5 + y);
				ctx.lineTo(0.5 + xMax, 0.5 + y);
			}
			ctx.stroke();
			var y = yMin;
			for (var i = 0; i < this.rows; i++) {
				var x = xMin;
				for(var j = 0; j < this.columns; j++){
					boardState[i][j].updateSize(x+this.columnThickness/2, y+this.rowThickness/2, tileWidth, tileHeight);
					newState[i][j].updateSize(x+this.columnThickness/2, y+this.rowThickness/2, tileWidth, tileHeight);
					
					if(newState[i][j].tileData.id != shared.blankTile.id && boardState[i][j].tileData.id != shared.blankTile.id){
						newState[i][j].drawOutline('#ff0000');
					}
					shapes[1].push(newState[i][j]);//middle layer
					shapes[2].push(boardState[i][j]); //bottom layer
					x += this.columnThickness;
				}
				y += this.rowThickness;
			}
			ctx.restore();
		}
	}
}

//socket stuff
*/
var socket = io(publicAddress); //try public address //"24.42.206.240" for alabama

var trylocal = 0;
socket.on('connect_error',function(error){
	console.log("I got an error!", error);
	console.log("socket to:", socket.disconnect().io.uri, "has been closed.");
	if(!trylocal){ //prevent loops
		if(window.location.href != internalAddress){
			window.location.replace(internalAddress);
		}
		socket.io.uri = internalAddress;
		console.log("Switching to local url:", socket.io.uri);
		console.log("Connecting to:",socket.connect().io.uri);
		trylocal = 1;
	}
});

socket.on('reconnect', function(attempt){
	console.log("reconnect attempt number:", attempt);
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

/*socket.on('tradeMatrix',(tradeMatrix)=>{
	console.log(playerTradeMatrix,'hi');
	playerTradeMatrix = tradeMatrix;
	tradingUi.forEach((i)=>{
		i.updateVisibility();
	});
});
*/
socket.on('allTiles', function(inAllTiles){
	allTiles = inAllTiles;
});

socket.on('startGame',()=>{
	console.log(userList);
	var textsize = 40;
	var y = textsize;
	userList.forEach((userName,i)=> {
		if (userName.ready){
			tradingUi.push(new BiddingInterface(i,y,textsize));
		}	
		y += textsize*1.5;
	});
});

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

/*Initializing the connection with the server via websockets */
var myTiles = [];
var playerTradeMatrix = [];
var tradingUi = [];
var boardState = [[]];
var newState = [[]];
var board = new Board(canvas.width/2, canvas.height/2, boardState.length, boardState[0].length, tileHeight+2*tilePadding, tileWidth+2*tilePadding);
var submitButton = new SubmitButton();
var shapes = [[],[],[]];
var userList = [];
var spectatorColor = "#444444";
var yourTurnColor = "#0000ff";
var newTileColor = "Chocolate";
var placeholderColor = '#444444';
var validPlayColor = '#00ff00';
var invalidPlayColor = '#ff0000';
var defaultTileColor = '#ffe0b3';
var newServerTileColor = '#aae0b3';
var myTurn = false;
var myUserlistIndex = 0;
var myUserlistString = "";

for (var i = 0;i < 10;i++){
	var tile = new Tile(
		canvas.width/2,
		((canvas.height)/2)/i,
		tileWidth,
		tileHeight,
		'',
		newTileColor,'#000000','#000000','#000000',
		20,true
	);
	//tile.drawOutline(placeholderColor); //placeholder outline
	myTiles.push(tile);
}
var confirmButtonTakeTop = new confirmButtonTakeTop((canvas.width/20) * 59,(canvas.hight/20) * 19,(canvas.width/10),(canvas.hight/20),'Take The Top Card','Red',undefined,'Black',undefined,30,false);
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
	//$('#chatlog').scroll();
	$('#chatlog').animate({scrollTop: 1000000});
});

socket.on('userList',function(data){
	var userListString = '';
	userList = data;
	for( var i = 0; i < data.length; i++ ){
		var header = 'div id="userListDiv'+ i + '"';
		var click = 'onclick="changeName(' + "'" + data[i].id + "'" + ')"';
		var color = ' style="color: ' + data[i].color + ';"'
		var string = '' + data[i].userName;
		var ender = '</div>';
		
		if(data[i].color != spectatorColor){
			string = string + " " + data[i].score;
			
			if(data[i].id == socket.id){
				if(soundsAllowed && !myTurn && data[i].color == yourTurnColor){
					ding.play(); //play ding when it becomes your turn
				} 
				myTurn = data[i].color == yourTurnColor; //update old status
				
				myUserlistIndex = i;
				myUserlistString = string;
			}
		}
		
		userListString = userListString + '<' + header + click + color + '>' + string + ender;
		//console.log( "player", data[i].userName, "myTurn", myTurn, "id", data[i].id, socket.id, "color", data[i].color, yourTurnColor);
	}
	document.getElementById('userlist').innerHTML = userListString;
	console.table(data);
	tradingUi.forEach((i)=>{
		i.updateVisibility();
	});
});

socket.on('showBoard',function(data){
	$('#title').css('color', data.titleColor);
	$('#content').css('display', data.displayTitle);
	$('#gameBoard').css('display', data.displayGame);
	resizeCanvas();
});

socket.on('tiles', function(tiles){
	serverTiles = tiles;
	
	for(var i = 0; i < tiles.length; i++){
		if (i < myTiles.length){
			myTiles[i].updateNumberAndText(tiles[i]);
		}
		
	}
	
	//resizeDrawings();
	console.log('tiles updated: ', myTiles);
});

socket.on('boardState', function(recievedBoardState){
	board.updateFromServer(recievedBoardState);
	
	if(newState.length != recievedBoardState.length || newState[0].length != recievedBoardState[0].length){ //clear new state if different size
		//TODO: move tiles in newState back to hand
		newState = [];
		if(boardState.length > 0 && boardState[0].length > 0){
			for(var row = 0; row < boardState.length; row++){
				var line = [];
				for(var col = 0; col < boardState[0].length; col++){
					var tile = new MoveTile(shared.newBlankTile(), 0, 0, tileHeight, tileWidth, tileFontSize);
					tile.fillColor = newTileColor;
					line.push(tile);
					//line.push(shared.newBlankTile());
				}
				newState.push(line);
			}
		}
	}
	
	updatePlayValidity();
});

socket.on('gameEnd',()=>{
	myTiles.forEach((t)=>{
		delete t;
	});
	myTiles = [];
});

function updatePlayValidity(){
	var check = shared.validTilesToPlay(serverTiles, getTileData(newState), getTileData(boardState), allTiles);
	if(check.error.length == 0){
		$('#userListDiv'+myUserlistIndex)[0].innerHTML = (myUserlistString + " + " + check.score);
	} else {
		$('#userListDiv'+myUserlistIndex)[0].innerHTML = (myUserlistString);
	}
	scoreIsValid = check.error.length == 0;
	//console.log("check", check);
}

function checkClick(event){
	var foundClick = false;
	var i;
	var area;
	var offset = $('#gameBoard').position();
	var scale = {x: canvas.width / $('#gameBoard').width(), y: canvas.height/ $('#gameBoard').height()};
	//console.log('click', {x: event.clientX, y: event.clientY});
	//console.log('scale:', scale)
	var click = {x: event.clientX*scale.x - offset.left, y: event.clientY*scale.y - offset.top};
	console.log('adjusted click: ', click);
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

//drawing stuff

function draw(){
	shapes = [[],[],[]]; //first object is top layer, second is middle, last is bottom layer
	ctx.textAlign="center";
	ctx.textBaseline = "middle";
	//console.log('draw: ', shapes );
	ctx.clearRect(0,0,canvas.width, canvas.height);
	
	//var radius = (Math.min(canvas.width, canvas.height-140)/2)-50;
	shapes[0].push(submitButton);
	//player tiles
	for(var i = 0; i < myTiles.length; i++){
		//if(myTurn){
		/*if(scoreIsValid){
			myTiles[i].drawOutline(validPlayColor);
		} else {
			myTiles[i].drawOutline(invalidPlayColor);
		}*/
		//} else {
		//	myTiles[i].drawOutline('#444444'); //placeholder outline
		//}
		shapes[0].push( myTiles[i] );//1st layer
	}
	
	//tradingUi
	tradingUi.forEach((ui)=> ui.addToShapes(shapes[0]));
	
	//selected outline
	if(selected != undefined){
		//debugger;
		selected.drawOutline('Chocolate');
	}
	
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

function resizeCanvas(){
	canvas.width = window.innerWidth - $('#sidebar').width() - 50;
	canvas.height = window.innerHeight - 2;
	console.log('canvas resized to: ', canvas.width, canvas.height);
	resizeDrawings();
}

function resizeDrawings(){
	tileWidth = 100; //* window.devicePixelRatio;
	tileHeight = 50; //* window.devicePixelRatio;
	tileFontSize = 30; //* window.devicePixelRatio;
	board.x = canvas.width/2;
	board.y = canvas.height/2;
	board.rowThickness = tileHeight + 2*tilePadding;
	board.columnThickness = tileWidth + 2*tilePadding;
	
	for(var i = 0; i < myTiles.length; i++){
		myTiles[i].updateSize((canvas.width/2) + (tileWidth + 20) * (i-(myTiles.length/2)+0.5) , canvas.height - (tileHeight + 20), tileHeight, tileWidth);
	}
	submitButton.updateSize(canvas.width/2, canvas.height-tileHeight-80, canvas.width, tileHeight);
}

/*
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
 
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

function polygon(ctx, x, y, radius, sides, startAngle, anticlockwise) {
	if (sides < 3) return;
	var a = (Math.PI * 2)/sides;
	a = anticlockwise?-a:a;
	ctx.save();
	ctx.translate(x,y);
	ctx.rotate(startAngle);
	ctx.moveTo(radius,0);
	for (var i = 1; i < sides; i++) {
		ctx.lineTo(radius*Math.cos(a*i),radius*Math.sin(a*i));
	}
	ctx.closePath();
	ctx.restore();
}