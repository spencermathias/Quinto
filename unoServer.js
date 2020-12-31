var express = require("express");
var http = require("http");
var io = require("socket.io");
var shared = require('./htmlUno/js/shared.js');
var deckFile = require('./htmlUno/js/deck.js');
var cardsInFaceUpPile = [];
var pile = [];
var deck = undefined;
var playDirectionClockwise = true;

var app = express();
app.use(express.static("./htmlUno")); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var socket = 8080;
//var server = http.createServer(app).listen(8080); //Server listens on the port 8124
var server = http.createServer(app).listen(socket,"0.0.0.0",511,function(){console.log(__line,"Server connected to socket: "+socket);});//Server listens on the port 8124
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */

var minPlayers = 2;
var maxPlayers = 10000;

var allClients = [];
var players = [];
var spectators = [];


var gameMode = {
    LOBBY: 0,
    PLAY: 1,
    END: 2
};

var playerStatus = {
	PLAYER: 0,
	SPECTATOR: 1
}

var colors = [ 'blue', 'green', 'yellow', 'red']

var gameStatus = gameMode.LOBBY;

var serverColor = "#ffff00";
var gameColor = "#00ff00";
var gameErrorColor = "#ff0000";
var chatColor = "#ffffff";
var readyColor = "#ffffff";
var notReadyColor = "#ff0000";
var readyTitleColor = "#00ff00";
var notReadyTitleColor = "#ff0000";
var spectatorColor = "#444444";
var notYourTurnColor = "#ffffff";
var yourTurnColor = "#0000ff";
var currentTurn = 0;
var wildPlayed = false;
var colorChosen = false;


console.log("Server Started!");

function defaultUserData(){
	return {
		//score: 0,
		userName: "Unknown",
		tiles: [],
		statusColor: notReadyColor,
		ready: false,
		alreadyPicked: false
	}
}

var stolenCard = {message:"you're crazy"}

io.sockets.on("connection", function(socket) {
    socket.userData = defaultUserData();

    allClients.push(socket);
    if (gameStatus === gameMode.LOBBY) {
        socket.userData.statusColor = notReadyColor;
    } else {
		spectators.push(socket);
        socket.userData.statusColor = spectatorColor;
        updateBoard(socket, notReadyTitleColor, true);
		updateUsers(socket);
    }

	message(socket, "Connection established!", serverColor)

    console.log(__line, "Socket.io Connection with client " + socket.id +" established");
	
	 socket.on("disconnect",function() {
		message( io.sockets, "" + socket.userData.userName + " has left.", serverColor);
		message( io.sockets, "Type 'kick' to kick disconnected players", serverColor);
        console.log(__line,"disconnected: " + socket.userData.userName + ": " + socket.id);
        var i = allClients.indexOf(socket);
        if(i >= 0){ allClients.splice(i, 1); }
		var i = spectators.indexOf(socket);
        if(i >= 0){ spectators.splice(i, 1); }
		updateUsers();
        //players are only removed if kicked
    });
	
	socket.on('oldId', function(id){
		console.log(__line, "oldID:", id);
		for(var i = 0; i < players.length; i++){
			if(players[i].id == id){
				console.log(__line, "found old player!", players[i].userData.username, socket.userData.userName);
				var j = spectators.indexOf(socket);
				if(j >= 0){spectators.splice(j, 1)};
				socket.userData = players[i].userData;
				players[i] = socket;
				socket.emit('tiles', socket.userData.tiles);
			} else {
				console.log(__line, "new player");
			}
		}
	});

    socket.on("message",function(data) {
        /*This event is triggered at the server side when client sends the data using socket.send() method */
        data = JSON.parse(data);

        console.log(__line, "data: ", data);
        /*Printing the data */
		message( socket, "You: " + data.message, chatColor);
		message( socket.broadcast, "" + socket.userData.userName + ": " + data.message, chatColor);

        if(data.message === "end") {
            console.log(__line,"forced end");
            gameEnd(undefined);
        } else if(data.message === "start") {
            console.log(__line,"forced start");
            gameStart();
        } else if(data.message.toLowerCase() === "kick"){
			console.log(__line, "clearing players");
			for(var i = players.length-1; i >= 0; i--){
				if(players[i].disconnected){
					message( io.sockets, "" + players[i].userData.userName + " has been kicked!", chatColor);
					players.splice(i, 1);
				}
			}
			if( players.length < minPlayers) {
				gameEnd(undefined);
			} 
		}
        /*Sending the Acknowledgement back to the client , this will trigger "message" event on the clients side*/
    });

    socket.on("userName", function(userName) {
        socket.userData.userName = userName;
        //socket.userData.ready = false;
        console.log(__line,"added new user: " + socket.userData.userName);
		message(io.sockets, "" + socket.userData.userName + " has joined!", serverColor);
        updateUsers();
    });

    socket.on("ready", function(ready) {
        if (gameStatus === gameMode.LOBBY){
            socket.userData.ready = ready;
			console.log(socket.userData.ready);
			if (socket.userData.ready === true) {
				socket.userData.statusColor = readyColor;
				updateBoard(socket, readyTitleColor , false);
			} else {
				socket.userData.statusColor = notReadyColor;
				updateBoard(socket, notReadyTitleColor , false);
			}
			console.log(__line,"" + socket.userData.userName + " is ready: " + ready);
            updateUsers();
            checkStart();
        }
    });
	
	socket.on('play the card',function(card){
		console.log('play the card emited');
		if(players[currentTurn].id == socket.id){
			if(card == null){
				message(socket,'dont click this card',gameErrorColor);
			}else{
				//console.log('it was their turn',card);
				let tileIndex = undefined;
				socket.userData.tiles.forEach(function(tile){
					let z = deck.getProperties(tile);
					//console.log(__line,z);
					if(card.fillColor == z.color){
						if(card.text == z.number){
							if(card.repeat == z.repeat){
								tileIndex = socket.userData.tiles.indexOf(tile);
								//console.log(__line,tileIndex);
							}
						}
					}
				});
				if(checkPlay(deck.getProperties(socket.userData.tiles[tileIndex]))){
					//console.log(__line,'check play was true',deck.getProperties(socket.userData.tiles[tileIndex]));
					cardsInFaceUpPile.push(socket.userData.tiles[tileIndex]);
					socket.userData.tiles.splice(tileIndex,1);
					if(card.text == 'skip'){
						doActionCard(deck.getProperties(socket.userData.tiles[tileIndex]),'skip',socket);
						//console.log(__line,'got in the loop for skip');
					}else{
						if(card.text == 'reverse'){
							doActionCard(deck.getProperties(socket.userData.tiles[tileIndex]),'reverse',socket);
							//console.log(__line,'got in the loop for reverse');
						}else{
							if(card.text == 'draw 2'){
								doActionCard(deck.getProperties(socket.userData.tiles[tileIndex]),'draw2',socket);
								//console.log(__line,'got in the loop for draw 2');
							}else{
								if(card.text == 'Wild'){
									doActionCard(deck.getProperties(socket.userData.tiles[tileIndex]),'wild',socket);
									//console.log(__line,'got in the loop for wild');
								}else{
									updateUsers();
									sendPlayersTiles();
									nextTurn(false,false,false);
									updateTurnColor();
								}
							}
						}
					}
					checkEnd(socket);
					
							
					//deck.returncard(cardsInFaceUpPile[0]);

				}else{
					message(socket,'you must play a card of the same color or number as the one in the middle',gameErrorColor);
				}
			}
		}else{
			message(socket,'its not your turn',gameErrorColor);
		}
	});
	
	socket.on('wild color picked',function(wildCard){
		cardsInFaceUpPile.splice(cardsInFaceUpPile.length - 1,1);
		if(wildCard.type = 'wildDraw4'){
			console.log(__line,deck.getCardId({color:wildCard.color,number:'Wild',repeat:2}));
			cardsInFaceUpPile.push(deck.getCardId({color:wildCard.color,number:'Wild',repeat:2}));
			nextTurn(false,false,true);
			updateUsers();
			sendPlayersTiles();
		}else{
			cardsInFaceUpPile.push(deck.getCardId({color:wildCard.color,number:'Wild',repeat:1}));
			nextTurn(false,false,false);
			updateUsers();
			sendPlayersTiles();
		}
	});
	
	socket.on('skip there turn',function(){
		dealTiles(socket.userData.tiles,1);
		nextTurn(false,false,false);
	});
	
});

function reshuffle(){
	cardsInFaceUpPile.forEach(function(card){
		deck.returnCard(card);
	});
}

function doActionCard(card,type,player){
	//console.log(__line,'why are we in here')
	if(type == 'wild'){
		console.log('got into wild in the doActionCard function');
		if(card.repeat == 1){
			wild(player,'wild');
			console.log(__line,'this is a wild draw 4');
		}else{
			wild(player,'wildDraw4');
		}
	}
	if(type == 'skip'){
		nextTurn(true,false,false);
		console.log('got into skip in the doActionCard function');
	}
	if(type == 'draw2'){
		nextTurn(false,true,false);
		console.log('got into draw 2 in the doActionCard function');
	}
	if(type == 'reverse'){
		playDirectionClockwise = !playDirectionClockwise;
		nextTurn(false,false,false);
		console.log('this is the reverse function');
	}
	updateUsers();
	sendPlayersTiles();
}

function wild(player,wildType){                                                                      
	player.userData.alreadyPicked = false;
	player.emit('wild card played',wildType);
}

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
	//console.log(__line,message);
	socket.emit('message',JSON.stringify(messageObj));
}

function updateUsers(target = io.sockets){
	//console.log(__line,"--------------Sending New User List--------------");
    var userList = [];
	if(gameStatus == gameMode.LOBBY){
		allClients.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	} else {
		players.forEach(function(client){
			client.userData.statusColor = (client.id == players[currentTurn].id)? yourTurnColor:notYourTurnColor
			userList.push(getUserSendData(client));
		});
		spectators.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	}
    //console.log(__line,"----------------Done Sending List----------------");
	target.emit('userList',userList);
}

function getUserSendData(client){
	//console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "|status:", client.userData.statusColor)//, "|score:", client.userData.score);
	return{
		cardsInFaceUpPile: cardsInFaceUpPile[cardsInFaceUpPile.length - 1],
		id: client.id,
		userName: client.userData.userName,
		color: client.userData.statusColor,
		//score: client.userData.score,
		ready: client.userData.ready,
	};
}

function getTileSendData(card){
	var tile = deck.getProperties(card);
	console.log(tile);
	return tile;
}

function updateBoard(socketSend, titleColor, showBoard) { //switches between title and game screen
    var showBoardMessage = {
        titleColor: titleColor,
        displayTitle: (showBoard === true) ? "none" : "flex",
        displayGame: (showBoard === true) ? "flex" : "none"
    };
    socketSend.emit("showBoard", showBoardMessage);
}

function checkStart() {	
    if(gameStatus === gameMode.LOBBY) {
        var readyCount = 0;
        allClients.forEach(function(client) {
            if( client.userData.ready ) {
                readyCount++;
            }
        });
        if(readyCount == allClients.length && readyCount >= minPlayers && readyCount <= maxPlayers) {
            gameStart();
        }
    }
}

function gameStart() {
	players = [];
	spectators = [];
	var playDirectionClockwise = true;
	deck = new deckFile({color:['Green','Blue','Yellow','Red'],number:[0,1,2,3,4,5,6,7,8,9,'skip','reverse','draw 2','Wild'],repeat:[1,2]});
	deck.shuffle(deck.length - 1);
	console.log(__line,deck.pile.length);
	deck.pile.forEach(function(card){
		let thisCard = deck.getProperties(card);
		//console.log(__line,thisCard);
		if(thisCard.repeat == 2){
			if(thisCard.number == 0){
				deck.pile.splice(card,1);
			}
		}
	});
	dealTiles(cardsInFaceUpPile,1);
	
	allClients.forEach(function(client){
		if(client.userData.ready){
			client.userData.statusColor = notYourTurnColor;
			client.userData.tiles = [];
			client.userData.score = 0;
			players.push(client);
			
		} else {
			client.userData.statusColor = spectatorColor;
			spectators.push(client);
		}
	});

	players.forEach(function(player){
		dealTiles(player.userData.tiles,7);
	});
	
	currentTurn = Math.floor(Math.random() * players.length);
	nextTurn(false,false,false);
	
	updateBoard(io.sockets, readyTitleColor, true);
	sendPlayersTiles();
	updateTurnColor();
	io.emit('startGame');
}

function dealTiles(array,amount){
	if(deck.pile.length == 0){
		reshuffle();
	}
	let x = deck.deal(amount);
	for(y = 0;y < x.length;y++){
		array.push(x[y]);
		//console.log(__line,x[y]);
	}
}

function sendPlayersTiles(){
	players.forEach(function (player){
		let playersTiles = [];
		let faceUpCard = [];
		player.userData.tiles.forEach(function(tile){
			playersTiles.push(deck.getProperties(tile));
			//console.log(__line,deck.getProperties(tile));
		});
		cardsInFaceUpPile.forEach(function(cardFaceUp){
			faceUpCard.push(deck.getProperties(cardFaceUp));
		});
		//console.log(faceUpCard);
		//console.log(__line,playersTiles);
		player.emit('cards',playersTiles);
		player.emit('discarded',faceUpCard[cardsInFaceUpPile.length - 1]);
	});
}

function checkPlay(cardToCheck){
	//console.log(cardToCheck);
	if(cardToCheck.color == deck.getProperties(cardsInFaceUpPile[cardsInFaceUpPile.length - 1]).color){
		return true;
	}else{
		if(cardToCheck.number == deck.getProperties(cardsInFaceUpPile[cardsInFaceUpPile.length - 1]).number){
			//console.log(__line,cardToCheck.number,deck.getProperties(cardsInFaceUpPile[cardsInFaceUpPile.length - 1]).number);
			return true;
		}else{
			if(cardToCheck.number == 'Wild'){
				return true;
			}
		}
		return false
	}
}

function playersTurn(player){
	var tilesPlayible = 0;
	player.userData.tiles.forEach(function(tile){
		//console.log(__line,checkPlay(deck.getProperties(tile)));
		if(checkPlay(deck.getProperties(tile))){
			tilesPlayible++;
			//console.log(__line,tilesPlayible);
		}
		//console.log(__line,checkPlay(deck.getProperties(tile)));
		//console.log(__line,cardsInFaceUpPile);
	});
	if(tilesPlayible == 0){
		dealTiles(player.userData.tiles,1)
		message(player,'you couldent play any of your cards so we just picked one for you',gameColor);
		sendPlayersTiles();
		nextTurn(false,false,false);
		updateUsers();
		updateTurnColor();
	}
}

function checkEnd(player){
	if (player.userData.tiles.length == 0){
		actuilyGameEnd(player);
	}
}

function gameEnd() {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message(io.sockets, "THE GAME HAS ENDED", gameColor);
	message(io.sockets, "Scores: ", gameColor);
	let total = 0;
	for( var i = 0; i < players.length; i += 1){
		message(io.sockets, players[i].userData.userName + ": " + players[i].userData.score + "\n", gameColor);
		total += players[i].userData.score;
	}
	message(io.sockets, "Total score: " + total, gameColor);
	io.emit('gameEnd');
	
    players = [];
	spectators = [];
    allClients.forEach(function(client) {
		
        client.userData.ready = false;
        client.userData.statusColor = notReadyColor;
    });
    gameStatus = gameMode.LOBBY;
    updateUsers();
}

function actuilyGameEnd(winner) {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message(io.sockets, "THE GAME HAS ENDED", gameColor);
	message(io.sockets, "Scores: ", gameColor);
	let total = 0;
	for( var i = 0; i < players.length; i += 1){
		message(io.sockets, players[i].userData.userName + ": " + players[i].userData.score + "\n", gameColor);
		total += players[i].userData.score;
	}
	message(io.sockets, "Total score: " + total, gameColor);
	message(io.sockets,'The winner is ' + winner.userData.userName +'!',gameColor)
	io.emit('gameEnd');
	
    players = [];
	spectators = [];
    allClients.forEach(function(client) {
		
        client.userData.ready = false;
        client.userData.statusColor = notReadyColor;
    });
    gameStatus = gameMode.LOBBY;
    updateUsers();
}

function nextTurn(skipedTurn = false,draw2 = false,draw4 = false){
	if(playDirectionClockwise){
		if(skipedTurn){
			currentTurn = (currentTurn + 1) % players.length;
			message(players[currentTurn],'you were skiped',gameColor);
		}else{
			if(draw2){
				currentTurn = (currentTurn + 1) % players.length;
				dealTiles(players[currentTurn].userData.tiles,2);
				message(players[currentTurn],'you had to draw 2',gameColor);
			}else{
				if(draw4){
					currentTurn = (currentTurn + 1) % players.length;
					dealTiles(players[currentTurn].userData.tiles,4);
					message(players[currentTurn],'you had to draw 4',gameColor);
				}
			}
		}
		currentTurn = (currentTurn + 1) % players.length;
	}else{
		if(skipedTurn){
			if(currentTurn < 1){
				currentTurn = ((currentTurn - 1) % players.length) + players.length;
			}else{
				currentTurn = (currentTurn - 1) % players.length
			}
			message(players[currentTurn],'you were skiped',gameColor);
		}else{
			if(draw2){
				if(currentTurn < 1){
					currentTurn = ((currentTurn - 1) % players.length) + players.length;
				}else{
					currentTurn = (currentTurn - 1) % players.length
				}
				dealTiles(players[currentTurn].userData.tiles,2);
				message(players[currentTurn],'you had to draw 2',gameColor);
			}else{
				if(draw4){
					if(currentTurn < 1){
						currentTurn = ((currentTurn - 1) % players.length) + players.length;
					}else{
						currentTurn = (currentTurn - 1) % players.length
					}
					dealTiles(players[currentTurn].userData.tiles,4);
					message(players[currentTurn],'you had to draw 4',gameColor);
				}
			}
		}
		if(currentTurn < 1){
			currentTurn = ((currentTurn - 1) % players.length) + players.length;
		}else{
			currentTurn = (currentTurn - 1) % players.length
		}
		console.log(__line,currentTurn);
	}
	console.log("It is " + players[currentTurn].userData.userName + "'s turn!")
	message(players[currentTurn], "It is your turn!", gameColor);
	playersTurn(players[currentTurn]);
	updateTurnColor();
	updateUsers();
}

function updateTurnColor(){
	if(players.length > 0){
		players.forEach(function(player){
			player.userData.statusColor = notYourTurnColor;
		});
		players[currentTurn%players.length].userData.statusColor = yourTurnColor;
		//console.log(__line,'update turn color');
		updateUsers();
	}
}

function updateBoard(socketSend, titleColor, showBoard) { //switches between title and game screen
    var showBoardMessage = {
        titleColor: titleColor,
        displayTitle: (showBoard === true) ? "none" : "flex",
        displayGame: (showBoard === true) ? "flex" : "none"
    };
    socketSend.emit("showBoard", showBoardMessage);
}

Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});
//allows to print line numbers to console
Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});

//allows input from the console
var stdin = process.openStdin();

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that  
    // with toString() and then trim() 
	var input = d.toString().trim();
    console.log('you entered: [' + input + ']');
	try{
		eval("console.log("+input+")");
	} catch (err) {
		console.log("invalid command");
	}
  });