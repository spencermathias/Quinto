//socket stuff
var localAddress = "localhost";

var socket = io("alanisboard.ddns.net"); //try public address
var trylocal = 0;
socket.on('connect_error',function(error){
	console.log("I got an error!", error);
	console.log("socket to:", socket.disconnect().io.uri, "has been closed.");
	if(!trylocal){ //prevent loops
		if(window.location.href != 'http://'+localAddress+':8080/'){
			window.location.replace('http://'+localAddress+'/');
		}
		socket.io.uri = localAddress+":8080";
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
	console.log("Connection successful!")
	//var username = prompt('Enter username: ');
	//socket.emit('newUser', username);
	
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
var myCards = [];
var trumpCard = {};
var tableCenter = {x:0,y:0};
var shapes = [];
var userList = [];
var showBid = false;
var spectatorColor = "#444444";

var InputList;

socket.on("message",function(message){  
	/*
		When server sends data to the client it will trigger "message" event on the client side , by 
		using socket.on("message") , one cna listen for the ,message event and associate a callback to 
		be executed . The Callback function gets the dat sent from the server 
	*/
	//console.log("Message from the server arrived")
	message = JSON.parse(message);
	console.log(message); /*converting the data into JS object */
	
	$('#chatlog').append('<div style="color:'+message.color+'">'+message.data+'</div>'); /*appending the data on the page using Jquery */
	$('#response').text(message.data);
	//$('#chatlog').scroll();
	$('#chatlog').animate({scrollTop: 1000000});
});

socket.on('userList',function(data){
	var userListString = '';
	userList = [];
	for( var i = 0; i < data.length; i++ ){
		
		var header = 'div id="userListDiv'+ i + '"';
		var click = 'onclick="changeName(' + "'" + data[i].id + "'" + ')"';
		var color = ' style="color: ' + data[i].color + ';"'
		var string = '' + data[i].userName;
		var ender = '</div>';
		
		userListString = userListString + '<' + header + click + color + '>' + string + ender;
		
		//userListString = userListString + '<div style="color: ' + data[i].color + ';">' + data[i].userName + '</div>';
		//console.log(data[i].userName + ' bid: ' + data[i].bid);
		if(data[i].color != spectatorColor){
			userList.push(data[i]);
		}
		InputList = data;
	}
	document.getElementById('userlist').innerHTML = userListString;
	console.table(data);
});

socket.on('showBoard',function(data){
	$('#title').css('color', data.titleColor);
	$('#content').css('display', data.displayTitle);
	$('#gameBoard').css('display', data.displayGame);
	resizeCanvas();
});

socket.on('trumpCard', function(card){
	trumpCard = card;
	resizeDrawings();
	console.log( 'trump card: ', card);
});

socket.on('cards', function(cards){
	myCards = cards;
	resizeDrawings();
	console.log('cards for round: ', myCards);
});

socket.on('requestBid', function(){
	showBid = false;
	console.log('request bid');
	showBidScreen(true);
	$('#bidArray').find('.bidButton').removeClass('selected');
});

socket.on('allBidsIn', function(){
	showBid = true;
	console.log('all bids in!');
	showBidScreen(false);
});

socket.on('requestCard', function(){
	console.log('request card');
});

socket.on('allCardsIn', function(){
	console.log('all cards in');
});

socket.on('playerLeadsRound', function(playerLeads){
	console.log('Does the player lead the round? ', playerLeads);
	if(playerLeads){
		$('#leadMessage').css('display', 'flex');
	} else {
		$('#leadMessage').css('display', 'none');
	}
	resizeCanvas();
});

$('#submit').click(function(){ /*listening to the button click using Jquery listener*/
	var data = { /*creating a Js ojbect to be sent to the server*/ 
		message:$('#message').val() /*getting the text input data      */             
	}
	socket.send(JSON.stringify(data)); 
	/*Data can be sent to server very easily by using socket.send() method 
	The data has to be changed to a JSON before sending
						  it (JSON.stringify() does this job )*/
	/* This triggers a message event on the server side 
	and the event handler obtains the data sent */ 

	$('#message').val('');
	return false;
});
$('#title').click(function(){
	if ( $(this).css('color') == 'rgb(255, 0, 0)'){
		<!-- $(this).css('color', '#00ff00'); -->
		socket.emit('ready', {ready: true});
	} else {
		<!-- $(this).css('color', '#ff0000'); -->
		socket.emit('ready', {ready: false});
	}
	return false;
});

$('.bidButton').click(function(){
	$(this).parent().find('.bidButton').removeClass('selected');
	$(this).addClass('selected');
	let val = parseInt($(this).attr('id'));
	socket.emit('recieveBid', val); 
	console.log(val);
	return false;
});

function checkClick(event){
	var i;
	var area;
	var offset = $('#gameBoard').position();
	var scale = {x: canvas.width / $('#gameBoard').width(), y: canvas.height/ $('#gameBoard').height()};
	//console.log('click', {x: event.clientX, y: event.clientY});
	//console.log('scale:', scale)
	var click = {x: event.clientX*scale.x - offset.left, y: event.clientY*scale.y - offset.top};
	//console.log('adjusted click: ', click);
	for( i = 0; i < myCards.length; i += 1){
		if( myCards[i].card.clickArea ){
			area = myCards[i].card.clickArea;
			//console.log(area);
			if( click.x  < area.maxX){
				if( click.x > area.minX){
					if( click.y < area.maxY){
						if( click.y > area.minY){
							console.log('cardClicked: ', myCards[i]);
							socket.emit('cardSelected', myCards[i]);
						}
					}
				}
			}
		} else {
			console.log('no click area');
		}
	}
}

function showBidScreen(show){
	$('#bidOverlay').css('display', (show) ? 'flex' : 'none');
	resizeCanvas();
}

//drawing stuff
var canvas = document.getElementById("gameBoard");
ctx = canvas.getContext("2d");
//console.log('ctx', ctx);
//console.log(canvas.width, canvas.height);

function draw(){
	ctx.textAlign="center";
	ctx.textBaseline = "middle";
	//console.log('draw: ', shapes );
	ctx.clearRect(0,0,canvas.width, canvas.height);
	
	//table
	ctx.fillStyle = '#777777';
	ctx.strokeStyle = '#000000';
	var radius = (Math.min(canvas.width, canvas.height-140)/2)-50;
	var angle = (2*Math.PI)/Math.max(4,userList.length)
	polygon(
		ctx, 
		tableCenter.x, 
		tableCenter.y,
		radius, //radius
		Math.max(4,userList.length),
		(Math.PI/2)-(angle/2)
	);
	ctx.fill();
	
	//draw played or selected cards on the table
	var startPlayer = 0;
	for( i = 0; i < userList.length; i += 1 ){
		if(userList[i].id === socket.id){
			startPlayer = i;
		}
	}
	selected = drawSelected(radius);
	var i;
	var fontSize = Math.min(canvas.height, canvas.width)/30;
	var offset;
	var lowerAlignment = radius*Math.cos(angle/2)+fontSize/2;
	for( i = 0; i < selected.length; i += 1){
		player = (startPlayer + i)% selected.length;
		//console.log('startplayer', player);
		ctx.save();
		ctx.translate(tableCenter.x, tableCenter.y);
		ctx.rotate(i*angle);
		selected[player] = drawCard(ctx, selected[player]);
		ctx.fillStyle = userList[player].color;
		ctx.font = fontSize + "px Arial Black, Gadget, Arial, sans-serif";
		offset = selected[player].width/2 + fontSize
		//lowerAlignment = selected[player].y + selected[player].height/2 + fontSize;
		ctx.fillText(userList[player].userName, 0, radius);
		if(showBid === true){
				ctx.fillText(userList[player].handsWon, offset, lowerAlignment);
				ctx.fillText('▬', offset, lowerAlignment + fontSize/2);
				ctx.fillText(userList[player].bid, offset, lowerAlignment + 1.2*fontSize);
		} else {
			ctx.fillText('0', offset, lowerAlignment);
			ctx.fillText('▬', offset, lowerAlignment + fontSize/2);
			ctx.fillText('█', offset, lowerAlignment + 1.2*fontSize);
		}
		ctx.fillText('score', -offset - fontSize, lowerAlignment);
		ctx.fillText(userList[player].score, -offset - fontSize, lowerAlignment + fontSize);
		ctx.restore();
	}
	
	//draw cards
	for( i = 0; i < shapes.length; i += 1){
		curShape = shapes[i];
		curshape = drawCard(ctx, curShape);
	}
	setTimeout(draw, 100); //repeat
}

draw();

function drawCard(ctx, curShape){
	ctx.strokeStyle = curShape.outline;
	ctx.fillStyle = curShape.color;
	roundRect(
		ctx, 
		curShape.x - (curShape.width/2), 
		curShape.y - (curShape.height/2), 
		curShape.width, curShape.height, 
		curShape.width/8, 
		curShape.color, 
		curShape.outline
	);
	//addHitbox
	curShape.clickArea = {
		minX: curShape.x - (curShape.width/2),
		maxX: curShape.x + (curShape.width/2),
		minY: curShape.y - (curShape.height/2),
		maxY: curShape.y + (curShape.height/2)
	}
	//draw number
	ctx.font = '' + curShape.fontSize + "px Arial Black, Gadget, Arial, sans-serif";
	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = '#000000';
	ctx.save();
	ctx.translate(curShape.x, curShape.y);
	if(curShape.textSlant){
		ctx.rotate(Math.atan(curShape.height/curShape.width));
	}
	ctx.fillText(curShape.text,0,-curShape.fontSize*.04);
	ctx.strokeText(curShape.text, 0, -curShape.fontSize*.04);
	ctx.restore();
	return curShape;
}

function drawMyCards(){
	var myCardShapes = [];
	if (myCards.length > 0){
		var i;
		var shape = {};
		var half = Math.floor(myCards.length/2);
		var spacing = canvas.width/10;
		var width = Math.min(canvas.height/10, canvas.width/15);
		var height = width*1.3;
		var text;
		var fSize;
		var textSlant;
		for (i = 0; i <  myCards.length; i += 1) {
			if( myCards[i].type === 'number' ){
				text = '' + myCards[i].number;
				fontSize = width/2;
				textSlant = false;
			} else {
				text = '' + myCards[i].type;
				fontSize = Math.sqrt(width*width+height*height)/text.length;
				textSlant = true;
			}
			myCards[i].card = {
				x: (canvas.width/2) + (i - half + .5)*spacing,
				y: canvas.height - (height/2) - Math.min(20, (spacing-width)/2),
				width: width,
				height: height,
				color: myCards[i].color,
				outline: '#000000',
				text: text,
				fontSize: fontSize,
				textSlant: textSlant
			}	
			myCardShapes.push(myCards[i].card);
		}
	}
	return myCardShapes;
}

function drawTrump(){
	var shape = {};
	if( trumpCard ){
		var text;
		var slant;
		var fontSize;
		var width = Math.min(canvas.height, canvas.width)/10;
		var height = (Math.min(canvas.height, canvas.width)/10)*1.3;
		if(trumpCard.type == 'none'){
			text = 'none';
			slant = true;
			fontSize = Math.sqrt(width*width+height*height)/text.length;
		} else {
			text = '' + trumpCard.number;
			slant = false;
			fontSize = width/2;
		}
			
		shape = {
			x: tableCenter.x,
			y: tableCenter.y,
			width: width,
			height: height,
			color: trumpCard.color,
			outline: '#000000',
			text: text,
			fontSize: fontSize,
			textSlant: slant
		}
	}
	return shape;
}

function drawSelected(radius){
	var shapes1 = [];
	var i;
	var width = Math.min(canvas.height, canvas.width)/10;
	var height = (Math.min(canvas.height, canvas.width)/10)*1.3;
	for( i = 0; i < userList.length; i += 1){
		card = userList[i].cardSelected;
		//console.log(card);
		if( card.type === 'number' ){
			text = '' + card.number;
			fontSize = width/2;
			textSlant = false;
		} else {
			text = '' + card.type;
			fontSize = Math.sqrt(width*width+height*height)/text.length;
			textSlant = true;
		}
		shape = {
			x: 0,
			y: radius/2,
			width: width,
			height: height,
			color: card.color,
			outline: '#000000',
			text: text,
			fontSize: (Math.min(canvas.height, canvas.width)/10)/2,
			textSlant: textSlant
		}
		shapes1.push(shape);
	}
	return shapes1;
}

function resizeCanvas(){
	canvas.width = window.innerWidth - $('#sidebar').width() - 50;
	canvas.height = window.innerHeight - $('#bidOverlay').height()- 50;
	console.log('canvas resized to: ', canvas.width, canvas.height);
	tableCenter = {x:canvas.width/2,y:canvas.height/2 
		- Math.min(canvas.height/10, canvas.width/15)*1.3*.5
		- Math.min(20, (canvas.width/10- Math.min(canvas.height/10, canvas.width/15))/2)};
	resizeDrawings();
}

function resizeDrawings(){
	shapes = drawMyCards();
	shapes.push(drawTrump());
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