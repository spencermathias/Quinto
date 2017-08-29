//TODO: conflicted cells - if a new board state comes in, but the user has placed tiles on the board, highlight cells that are in a conflicted state and allow user to move their tile off
// refresh tiles button to put all user tiles back in hand
// button to get new tiles
// highlight center square
// highlight hand places
// change background base on if tiles are valid
// show new points as a +points in the user list
// print new points to the chat log or make a grid showing all turn scores and total
// hide submit button if not your turn
// put chat log behind a button for mobile; only show the last message for a second
var tileWidth = 40;
var tileHeight = 40;
var tilePadding = 5;
var tileFontSize = 30;
var selected = undefined;

var canvas = document.getElementById("gameBoard");
var ctx = canvas.getContext("2d");
//console.log('ctx', ctx);
//console.log(canvas.width, canvas.height);

class Button {
	constructor(x, y, width, height, text = "button", fillColor, outlineColor, textColor, textOutlineColor, fontSize = 50, textSlant = false){
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.fillColor = fillColor;
		this.outlineColor = outlineColor;
		this.textColor = textColor;
		this.textOutlinecolor = textOutlineColor;
		this.fontSize = fontSize;
		this.text = text;
		this.textSlant = textSlant;
		this.clickArea = {minX: x - width/2, minY: y - height/2, maxX: x + width/2, maxY: y + height/2};
		this.visible = true;
	}
	draw(ctx){
		if(this.visible){
			ctx.save();
			ctx.fillStyle = this.fillColor;
			ctx.strokeStyle = this.outlineColor;
			roundRect(ctx, this.clickArea.minX, this.clickArea.minY, this.width, this.height, this.width/8, this.fillColor != undefined, this.outlineColor != undefined);

			//draw number
			ctx.font = '' + this.fontSize + "px Arial Black, Gadget, Arial, sans-serif";
			ctx.fillStyle = this.textColor;
			ctx.strokeStyle = this.textOutlineColor;
			ctx.translate(this.x, this.y);
			if(this.textSlant){
				ctx.rotate(Math.atan(this.height/this.width));
			}
			if(this.textColor != undefined){
				ctx.fillText(this.text,0,-this.fontSize*.04);
			}
			if(this.textOutline != undefined){
				ctx.strokeText(this.text, 0, -this.fontSize*.04);
			}
			ctx.restore();
		}
	}
	
	click(){
		console.log("This button has not been overloaded yet!");
	}
} 

class Tile extends Button{
	constructor(tileData, x,y,width,height,fontSize){
		var text = '-1';
		var hasData = false;
		if(tileData != undefined){
			text = tileData.number
			hasData = true;
		}
		super(x,y,width,height,text,'#ffe0b3','#000000','#000000',undefined,fontSize,false);
		this.tileData = tileData;
		this.visible = (text >= 0);
	}
	
	drawSelected(ctx){
		ctx.save();
		ctx.fillStyle = '#0000ff';
		roundRect(ctx, this.x-(this.width/2 + tilePadding), this.y-(this.height/2 + tilePadding), this.width+2*tilePadding, this.height+2*tilePadding, this.width/8,true, false);
		ctx.restore();
	}
	
	click(){
		if(selected != undefined){ //switch
			console.log("switch", selected.tileData, this.tileData);
			if(selected.tileData != undefined){
				var tempNumber = selected.tileData.number;
				var tempOwner = selected.tileData.owner;
				var tempId = selected.tileData.id;
				selected.tileData.id = this.tileData.id;
				selected.tileData.owner = this.tileData.owner;
				selected.tileData.number = this.tileData.number;
				this.tileData.number = tempNumber;
				this.tileData.owner = tempOwner;
				this.tileData.id = tempId;
				selected = undefined;
			} else {
				this.tileData = undefined;
			}
		} else { //select
			selected = this;
		}
		console.log("I am tile of number: " + this.tileData.number + " and Id: " + this.tileData.id, this);
	}
}

class SubmitButton extends Button{
	constructor(x, y, width, height, text, fontSize, clickFunction){
		super(x,y,width,height,text,'#0000ff',undefined,'#ffffff',undefined,fontSize,false)
		this.click = clickFunction;
	}
}

// class BoardPlace extends Button{
	// constructor(row,col,x,y,width,height,text,fontSize){
		// super(x,y,width,height,text,'#ffe0b3','#000000','#000000',undefined,fontSize,false);
		// this.visible = false;
		// this.row = row;
		// this.col = col;
	// }
	
	// click(){
		// console.log("I am at row " + this.row + " and column: " + this.col);
	// }
// }

//socket stuff

var socket = io("67.177.33.109"); //try public address //"24.42.206.240" for alabama
var trylocal = 0;
socket.on('connect_error',function(error){
	console.log("I got an error!", error);
	console.log("socket to:", socket.disconnect().io.uri, "has been closed.");
	if(!trylocal){ //prevent loops
		socket.io.uri = "192.168.0.21:8080";
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
	var username = prompt('Enter username: ');
	socket.emit('newUser', username);
});

/*Initializing the connection with the server via websockets */
var myTiles = [];
var boardState = [];
var shapes = [];
var userList = [];
var spectatorColor = "#444444";
var yourTurnColor = "#0000ff";
var InputList;
var myTurn = false;

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
		if(data[i].color != spectatorColor){
			userListString = userListString + '<div style="color: ' + data[i].color + ';">' + data[i].userName + " " + data[i].score + '</div>';
			userList.push(data[i]);
			if(data[i].id == socket.id){
				myTurn = (data[i].color == yourTurnColor);
			}
		} else {
			userListString = userListString + '<div style="color: ' + data[i].color + ';">' + data[i].userName + '</div>';
		}
		console.log( "player", data[i].userName, "myTurn", myTurn, "id", data[i].id, socket.id, "color", data[i].color, yourTurnColor);
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

socket.on('tiles', function(tiles){
	myTiles = tiles;
	resizeDrawings();
	console.log('tiles updated: ', myTiles);
});

socket.on('boardState', function(recievedBoardState){
	boardState = recievedBoardState;
});

$('#submit').click(function(){
	var data = {
		message:$('#message').val()         
	}
	socket.send(JSON.stringify(data)); 
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
		if( shapes[i].clickArea ){
			area = shapes[i].clickArea;
			//console.log(area);
			if( click.x  < area.maxX){
				if( click.x > area.minX){
					if( click.y < area.maxY){
						if( click.y > area.minY){
							shapes[i].click()
							foundClick = true;
						}
					}
				}
			}
		} else {
			console.log('no click area');
		}
	}
	if(!foundClick){
		selected = undefined;
	}
}

//drawing stuff

function draw(){
	shapes = [];
	ctx.textAlign="center";
	ctx.textBaseline = "middle";
	//console.log('draw: ', shapes );
	ctx.clearRect(0,0,canvas.width, canvas.height);
	
	//var radius = (Math.min(canvas.width, canvas.height-140)/2)-50;
	
	//board
	if(boardState.length > 0){
		drawBoard(ctx, canvas.width/2, canvas.height/2, boardState.length, boardState[0].length, tileHeight+2*tilePadding, tileWidth+2*tilePadding);
	}
	
	if(selected != undefined){
		selected.drawSelected(ctx);
	}

	//player tiles
	for(var i = 0; i < myTiles.length; i++){
		shapes.push( new Tile(myTiles[i], (canvas.width/2) + (tileWidth + 20) * (i-2) , canvas.height - (tileHeight + 20), tileHeight, tileWidth, tileFontSize));
	}
	
	//button
	if(myTurn){
		var submitButton = new SubmitButton(canvas.width/2, 60, tileWidth*4, tileHeight, "SUBMIT", tileFontSize, function(){console.log("sending to server"); socket.emit("newBoardState", boardState)})
		shapes.push(submitButton);
	}
	
	//ctx.fill();
	
	/*
	//draw selected
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
	*/
	//draw cards
	for( i = 0; i < shapes.length; i += 1){
		shapes[i].draw(ctx);
	}
	setTimeout(draw, 100); //repeat
}
draw();

// function drawMyCards(){
	// var myCardShapes = [];
	// if (myTiles.length > 0){
		// var i;
		// var shape = {};
		// var half = Math.floor(myTiles.length/2);
		// var spacing = canvas.width/10;
		// var width = Math.min(canvas.height/10, canvas.width/15);
		// var height = width*1.3;
		// var text;
		// var fSize;
		// var textSlant;
		// for (i = 0; i <  myTiles.length; i += 1) {
			// if( myTiles[i].type === 'number' ){
				// text = '' + myTiles[i].number;
				// fontSize = width/2;
				// textSlant = false;
			// } else {
				// text = '' + myTiles[i].type;
				// fontSize = Math.sqrt(width*width+height*height)/text.length;
				// textSlant = true;
			// }
			// myTiles[i].card = {
				// x: (canvas.width/2) + (i - half + .5)*spacing,
				// y: canvas.height - (height/2) - Math.min(20, (spacing-width)/2),
				// width: width,
				// height: height,
				// color: myTiles[i].color,
				// outline: '#000000',
				// text: text,
				// fontSize: fontSize,
				// textSlant: textSlant
			// }	
			// myCardShapes.push(myTiles[i].card);
		// }
	// }
	// return myCardShapes;
// }

function drawBoard(ctx, xPos, yPos, rows, columns, rowThickness, columnThickness){
	
	if (rows > 0 && columns >0){
		ctx.save()
		var bh = rows*rowThickness;
		var bw = columns*columnThickness;
		//console.log(xPos, yPos, rows, columns, rowThickness, columnThickness)
		//console.log(xPos, yPos,bw, bh);
		var xMin = xPos - bw/2;
		var xMax = xPos + bw/2;
		var yMin = yPos - bh/2;
		var yMax = yPos + bh/2;
		
		ctx.fillStyle = '#0000CD';
		var border = Math.min(.01*bw, .01*bh);
		ctx.fillRect(xMin - border, yMin - border, bw + 2*border, bh + 2*border);
		ctx.fillStyle = '#4682B4';
		ctx.strokeStyle = '#B0C4DE';
		ctx.lineWidth = 2;
		ctx.fillRect(xMin,yMin,bw, bh);
		for (var x = xMin; x <= xMax; x += columnThickness) {
			ctx.moveTo(0.5 + x, 0.5 + yMin);
			ctx.lineTo(0.5 + x, 0.5 + yMax);
		}

		for (var y = yMin; y <= yMax; y += rowThickness) {
			ctx.moveTo(0.5 + xMin, 0.5 + y);
			ctx.lineTo(0.5 + xMax, 0.5 + y);
		}
		ctx.stroke();
		var y = yMin;
		for (var i = 0; i < rows; i++) {
			var x = xMin;
			for(var j = 0; j < columns; j++){
				shapes.push( new Tile( boardState[i][j], x+columnThickness/2, y+rowThickness/2, tileWidth, tileHeight, tileFontSize));
				x += columnThickness;
			}
			y += rowThickness;
		}
		ctx.restore();
	}
}



// function drawSelected(radius){
	// var shapes1 = [];
	// var i;
	// var width = Math.min(canvas.height, canvas.width)/10;
	// var height = (Math.min(canvas.height, canvas.width)/10)*1.3;
	// for( i = 0; i < userList.length; i += 1){
		// card = userList[i].cardSelected;
		// //console.log(card);
		// if( card.type === 'number' ){
			// text = '' + card.number;
			// fontSize = width/2;
			// textSlant = false;
		// } else {
			// text = '' + card.type;
			// fontSize = Math.sqrt(width*width+height*height)/text.length;
			// textSlant = true;
		// }
		// shape = {
			// x: 0,
			// y: radius/2,
			// width: width,
			// height: height,
			// color: card.color,
			// outline: '#000000',
			// text: text,
			// fontSize: (Math.min(canvas.height, canvas.width)/10)/2,
			// textSlant: textSlant
		// }
		// shapes1.push(shape);
	// }
	// return shapes1;
// }

function resizeCanvas(){
	canvas.width = window.innerWidth - $('#sidebar').width() - 50;
	canvas.height = window.innerHeight - 2;
	console.log('canvas resized to: ', canvas.width, canvas.height);
	resizeDrawings();
}

function resizeDrawings(){
	return true;
	//shapes = drawMyCards();
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