var express = require("express");
var http = require("http");
var io = require("socket.io");
var shared = require('./htmlUno/js/shared.js');
var deckFile = require('./htmlUno/js/deck.js');
var cardsInFaceUpPile = [];
var pile = [];
var deck = undefined;

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
		if(wildPlayed){
			var color = colors.indexOf(data.message);
			if(color != -1){
				colorChosen = colors[color];
				wild(socket);
			}
		}
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
		var tilesPlayible = 0;
		socket.userData.tiles.forEach(function(tile){
			if(checkPlay(tile)){
				tilesPlayible++;
			}
		});
		if(tilesPlayible >= 1){
			if(checkPlay(card)){
				socket.userData.tiles.splice(socket.userData.tiles.indexOf(card),1);
				deck.returncard(cardsInFaceUpPile[0]);
				cardsInFaceUpPile.push(card);
			}
		}else{
			socket.userData.push(deck.deal());
			message(socket,'you couldent play any of your cards so we just picked one for you',gameColor);
		}
	});
	
});

function doActionCard(card){
	if(card.number == 'wild'){
		if(card.repeat == 1){
			
		}else{
			players[currentTurn].userData.tiles.push(deck.deal(4));
			
			nextTurn(true);
		}
	}
	if(card.number == 'skip'){
		nextTurn(true);
	}
	if(card.number == 'draw 2'){
		players[currentTurn].userData.tiles.push(deck.deal(2));
		nextTurn(true);
	}
	if(card.number == 'reverse'){
		playDirectionClockwise = !playDirectionClockwise;
		nextTurn();
	}
}

function wild(player){                                                                      
	while(colorChosen = false){
	}
	
}

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
	console.log(socket,message,color);
	socket.emit('message',JSON.stringify(messageObj));
}

function updateUsers(target = io.sockets){
	console.log(__line,"--------------Sending New User List--------------");
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
    console.log(__line,"----------------Done Sending List----------------");
	target.emit('userList',userList);
}

function getUserSendData(client){
	console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "|status:", client.userData.statusColor)//, "|score:", client.userData.score);
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
	var cardsInFaceUpPileForCheck = [];
	cardsInFaceUpPileForCheck.push(deck.deal());
	cardsInFaceUpPileForCheck.forEach(function(card){
		cardsInFaceUpPile.push(getTileSendData(card));
	});
	
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
	currentTurn = Math.floor(Math.random() * players.length);
	nextTurn();
	
	var playersTilesForCheck = [];
	updateBoard(io.sockets, readyTitleColor, true);
	players.forEach(function (player){
		playersTilesForCheck.push(deck.deal(7));
		console.log(playersTilesForCheck);
		playersTilesForCheck[0].forEach(function(card){
			player.userData.tiles.push(getTileSendData(card));
		});
		playersTilesForCheck = [];
		player.emit('cards',cardsInFaceUpPile[0],player.userData.tiles);
	});
	updateUsers();
	io.emit('startGame');
}

function checkPlay(cardToCheck){
	if(cardToCheck.getProprities(deckFile[cardToCheck]).color == cardsInFaceUpPile[0].color || cardToCheck.number == cardsInFaceUpPile.number){
		return true;
	}else{
		return false
	}
}

function checkEnd(){
	for(var i = 0;i < players.length;i++){
		if (players[i].userData.tiles.length == 0){
			gameEnd(players[i]);
			break;
		}
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

function actilyGameEnd(winner) {
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

function nextTurn(skipedTurn){
	if(gameStatus == gameMode.PLAY){
		if(playDirectionClockwise){
			if(skipedTurn = false){
				currentTurn = (currentTurn + 2) % players.length;
			}else{
				currentTurn = (currentTurn + 1) % players.length;
			}
		}else{
			if(skipedTurn = false){
				currentTurn = (currentTurn - 2) % players.length;
			}else{
				currentTurn = (currentTurn - 1) % players.length;
			}
		}
	}else{
		currentTurn = (currentTurn + 1) % players.length;
	}
	console.log(players[currentTurn]);
	console.log("It is " + players[currentTurn].userData.userName + "'s turn!")
	message(players[currentTurn], "It is your turn!", gameColor);
	updateUsers();
}

function updateUsers(target = io.sockets){
	console.log(__line,"--------------Sending New User List--------------");
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
    console.log(__line,"----------------Done Sending List----------------");
	target.emit('userList',userList);
}

function updateTurnColor(){
	if(players.length > 0){
		players.forEach(function(player){
			player.userData.statusColor = notYourTurnColor;
		});
		players[currentTurn%players.length].userData.statusColor = yourTurnColor;
		console.log(__line,'update turn color');
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