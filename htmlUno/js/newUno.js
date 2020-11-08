//events
var publicAddress = 'http://localhost:8080/';
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
	constructor(x,y,text,fillColor){
		/*console.log(x);
		console.log(y);
		console.log(text);*/
		console.log(fillColor);
		super(x,y,40,40,text,fillColor,undefined,'Black',undefined,20,false);
		this.updateSize(x,y);
		this.text = text;
		this.visible = true;
	}
	updateSize(x,y){
		this.width = 40;
		this.height = 40;
		this.x = x;
		this.y = y;
		this.clickArea = {minX: x - this.width/2, minY: y - this.height/2, maxX: x + this.width/2, maxY: y + this.height/2};
	}
	click(){
		if(myTurn){
			socket.emit('play the card',myTilesThatISomtimesLove[this]);
		}
	}
}

var myTilesThatISomtimesLove = [];
var shapes = [[],[],[]];
var myTurn = false;
var userList = [];
var myUserName = undefined;
var myUserlistIndex = 0;
var myUserlistString = "";
var socket = io(publicAddress);
var tilesDiscarded = undefined;
var spectatorColor = "#444444";
var yourTurnColor = "#0000ff";
var placeholderColor = '#444444';

socket.on('showBoard',function(data){
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
	resizeDrawings();
	for( var i = 0; i < data.length; i++ ){
		tilesDiscarded = new Card(75,50,data[i].cardsInFaceUpPile);
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
	//console.table(data);
	if(myTurn){
		pickFromPile.visible = true;
	}
});

socket.on('cards',function(cardYouSee,yourCards){
	myTilesThatISomtimesLove = [];
	console.log(yourCards);
	yourCards.forEach(function(card){
		var card = new Card(
			canvas.width / yourCards.length * (yourCards.indexOf(card)),
			25,
			card.number,
			card.color
		);
		myTilesThatISomtimesLove.push(card);
		card.visible = true;
		console.log(canvas.width / yourCards.length * (yourCards.indexOf(card)));
	});
	if(cardYouSee != undefined){
		tilesDiscarded = new Card(75,50,cardYouSee.number,cardYouSee.color);
	}
	//console.table(myTilesThatISomtimesLove);
	//console.table(tilesDiscarded);
	//console.log('got new data');
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
	//$('#chatlog').scroll();
	$('#chatlog').animate({scrollTop: 1000000});
});

function resizeCanvas(){
	canvas.width = window.innerWidth - $('#sidebar').width() - 50;
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
		myTilesThatISomtimesLove[i].updateSize(myTilesThatISomtimesLove[i].xpercent,myTilesThatISomtimesLove[i].ypercent);
	}
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
	shapes[0].push(submitButton);
	if(myTurn){
	}
	if (tilesDiscarded != undefined){
		shapes[0].push(tilesDiscarded);
	}
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