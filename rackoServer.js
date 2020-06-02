//subtract tiles at end
//TODO: be able to turn in tiles and get new ones
//TODO: send current board state to new connections
//subtract remaining tiles

var express = require("express");
var http = require("http");
var io = require("socket.io");
var shared = require('./htmlRacko/js/shared.js'); //get shared functions
var cardOnTop = [];
var cardsInFaceUpPile = [];
var cardPlayedOnTopOf = [];
var pile = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60];
//const spawn = require("child_process").spawn;

var app = express();
app.use(express.static("./htmlRacko")); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var socket = 8080;
//var server = http.createServer(app).listen(8080); //Server listens on the port 8124
var server = http.createServer(app).listen(socket,"0.0.0.0",511,function(){console.log(__line,"Server connected to socket: "+socket);});//Server listens on the port 8124
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */

var minPlayers = 2;
var maxPlayers = 20;

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


console.log("Server Started!");

function defaultUserData(){
	return {
		userName: "Unknown",
		tiles: [],
		statusColor: notReadyColor,
		ready: false,
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
            gameEnd();
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
				gameEnd();
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
	
	
	
	/*socket.on('submitedBidTiles',function(tileNumbers){
		//makes sure people actily have those cards
		if (checkCardOwner(socket,tileNumbers)!= undefined){
			socket.userData.bids.push(tileNumbers);
			updateUsers();
		}
	});*/
	
	/*socket.on('attemptTrade',function(tileNumbers, toPlayerNumber){
		if (checkCardOwner(socket,tileNumbers)!= undefined){
			console.log(__line,playerTradeMatrix);
			fromPlayerNumber = players.indexOf(socket);
			if (fromPlayerNumber >= 0){
				playerTradeMatrix[toPlayerNumber][fromPlayerNumber].push(tileNumbers);
			}
			pid = players[toPlayerNumber].id;
			console.log(__line,pid,'toPlayerNumber',toPlayerNumber,players[toPlayerNumber].userData.userName);
			players[toPlayerNumber].emit('tradeMatrix',playerTradeMatrix[toPlayerNumber]);
			console.log(__line,playerTradeMatrix);
		}
	});*/
	
	//socket.on('takeFaceUpClicked'function (){
		//socket.on('switchCards'function () {
			
	/*socket.on('tradeReady',function(userNumber,placeNumber){
		let fromPlayerNumber = players.indexOf(socket);
		let trade = playerTradeMatrix[fromPlayerNumber][userNumber].pop();
		console.log(__line,'trade fromPlayerNumber',trade,fromPlayerNumber);
		if(trade != undefined){
			let length = trade.length - 1;
			//console.log(__line,'length',length);
			//console.log(__line,'players[userNumber]',players[userNumber]);
			//console.log(__line,'socket.userData.bids',socket.userData.bids);
			let tradeResopnseNum = -1;
			for (let r = 0;r < socket.userData.bids.length;r++){
				if (socket.userData.bids[r].length == trade.length){
					tradeResopnseNum = r;
					break;
				}
			}
			if (tradeResopnseNum >= 0){
				let tradeResopnse = socket.userData.bids.splice(tradeResopnseNum,1)[0];
				console.log(__line,'trade',trade);
				console.log(__line,'tradeResopnse',tradeResopnse);
				let playerFrom = players[userNumber];
				for (var x = 0;x < tradeResopnse.length;x++){
					//get tile from player from
					let tileNumber = playerFrom.userData.tiles.indexOf(trade[x]);
					let temp = playerFrom.userData.tiles[tileNumber];
					playerFrom.userData.tiles[tileNumber] = tradeResopnse[x];
					tileNumber = socket.userData.tiles.indexOf(tradeResopnse[x]);
					socket.userData.tiles[tileNumber] = temp;
				}
				updateUsers();
				sendTilesToPlayer(socket);
				sendTilesToPlayer(playerFrom);
				playerFrom.emit('tradeMatrix',playerTradeMatrix[playerFrom]);
				socket.emit('tradeMatrix',playerTradeMatrix[fromPlayerNumber]);
				message(playerFrom,'Traded with '+socket.userData.userName,gameColor);
				message(socket,'Traded with '+ playerFrom.userData.userName,gameColor);
			}
		}
	});
	
	socket.on('cheakEndOfRound',function(){
		var add = cheakWin(socket.userData.tiles);
		console.log(__line,'check end of round',socket.userData.tiles);
		console.log(__line,add);
		if(add!= 0){
			newRound(socket,add);
		}
	});*/
	
	socket.on('get from face down',()=> {
		//TODO: show the face down card
		var x = Math.floor(Math.random * pile.length);
		cardsInFaceUpPile.push(x);
	});
	
	socket.on('submit pushed',function(){
		cheakWin(socket.userData);
	});
	
	socket.on('switch with deack',function(number,slotNum){
		if( players[currentTurn%players.length].id === socket.id ){
			cardsInFaceUpPile.push(socket.userData.tiles[number]);
			socket.userData.tiles.splice(slotNum,0,1,[cardsInFaceUpPile.length - 1]);
			socket.emit('new data',cardsInFaceUpPile[0],socket.userData.tiles[slotNum]);
			newTurn();
		}else{
			message(socket,'its not your turn',gameErrorColor);
			
		}
	});
});

function shuffleAndDeel(fromArayy,toArayy){
	x = Math.floor(Math.random * fromArayy.length);
	toArayy.push(x);
	y = fromArayy.indexOf(x);
	fromArayy.splice(y,1)
}




function cheakWin(playerToCheak){
	if(players[currentTurn].userData == playerToCheak){
		var tilesCorect = 0;
		let playersTiles = playerToCheak.tiles;
		for(let i = 0,i < playersTiles.length - 1,i++){
			if(playersTiles[i] < playersTiles[i + 1]){
				tilesCorect++;
			}else{
				message(socket,'your tiles arnt in order, to win the game all your tiles must be in order from least to gratest',gameErrorColor);
				break;
			}
		}
		var runs = 0;

		if(tilesCorect == playersTiles.length - 1){
			for(let a = 0,a < playersTiles.length - 2,a++){
				if(playersTiles[a] + 1 == playersTiles[a + 1]){
					if(playersTiles[a] + 2 = playersTiles[a + 2]){
						
						runs++;
					
					}
				}
			}
			
			if(runs > 0){
				actilyGameEnd(playerToCheak.userData.userName);
			}else{
				message(socket,'To win the game you must have at least one run of 3',gameErrorColor);
			}
		}
	}
}

function checkCardOwner(socket,tileNumbers){
	try{
		tileNumbers.forEach((t)=>{
			//console.log(__line,t);
			if(socket.userData.tiles.indexOf(t)<0){
				throw stolenCard;             
			}
		});
		return tileNumbers;
	}catch(e){
		if(e == stolenCard){
			message(socket,e.message,gameErrorColor);
			console.warn(e.message);
		}else throw e;
	}
	return undefined;
}

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
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
			userList.push(getUserSendData(client));
		});
		spectators.forEach(function(client){
			userList.push(getUserSendData(client));
		});
	}
    console.log(__line,"----------------Done Sending List----------------");
	
	io.sockets.emit('userList', userList);
}

function getUserSendData(client){
	console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "|status:", client.userData.statusColor, "|score:", client.userData.score);
	return{
		id: client.id,
		userName: client.userData.userName,
		color: client.userData.statusColor,
		score: client.userData.score,
		ready: client.userData.ready,
	};
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

var playerTradeMatrix = [];

function gameStart() {
	console.log(__line,"gameStart");
	message(io.sockets, "THE GAME HAS STARTED", gameColor);
	gameStatus = gameMode.PLAY;
	//reset players
	players = [];
	spectators = [];
	allClients.forEach(function(client){ 
		if(client.userData.ready){
			client.userData.statusColor = notYourTurnColor;
			client.userData.tiles = [];
			client.userData.score = 0;
			client.userData.skippedTurn = false;
			players.push(client);
		} else {
			client.userData.statusColor = spectatorColor;
			spectators.push(client);
		}
	});
	var y = Math.floor(Math.random * pile.length);
	cardsInFaceUpPile.push(y);
	socket.emit('new data',y,undefined);
	
	updateBoard(io.sockets, readyTitleColor, true);
	console.log(__line,'p',players.length);
	//console.log(__line, "cards", pile) ;
	//console.log(__line, "cards", tiles);
	players.forEach(function (player){
		dealTiles(player,pile,10);
	});
	sendTilesToAllPlayers(players);
	//console.log(__line, "cards", tiles);
	//console.log(__line, "allTiles", allTiles);
	updateUsers();

	//wait for turn plays
	io.emit('startGame');
}

function sendBoardState(){
	io.sockets.emit("boardState", boardState);
}


function dealAllTiles(players,carddeck){
	if (players.length > 0){
		var p = 0;
		while(carddeck.length > 0){
			dealSingleTile(players[p],carddeck);
			p = (p+1) % players.length;
		}
	} else {
		console.warn(__line,' No cards delt because there are no players');
	}
}

//deals a set nuber of tiles to a players
function dealTiles(player, carddeck, amountToBeDelt) {
	var tileToGive;
	var i;
	for( i = 0; i < amountToBeDelt; i+=1) {
		dealSingleTile(player, carddeck);
	}
}

//deals a single tile
function dealSingleTile(player,carddeck){
	x = Math.floor(Math.random * pile.length);
	player.userData.tiles.push(x);
	y = pile.indexOf(x);
	pile.splice(y,1)
}

//removes a element from deck array and gives it to the players user data array
function chooseRandomTile(carddeck) {
	if(carddeck.length > 0){
		var index = Math.floor(Math.random() * carddeck.length);
		var returnTile = carddeck[index];
		carddeck.splice(index, 1);
		return returnTile;
	}
}

//updates all players cards
function sendTilesToAllPlayers(players){
	for (var u = 0;u < players.length; u++){
		sendTilesToPlayer(players[u]);
	}
}

//updates a single players cards
function sendTilesToPlayer(player){
	if (player != undefined){
		player.emit("tiles", player.userData.tiles);
		//message(io.sockets, tiles.length + " tiles left", gameColor);
	}
}
/*
function returnTileToDeck(player, tile, tileDeck) {
	var tileIndex = player.userData.tiles.indexOf(tile);
	if (tileIndex >= 0){
		player.userData.tiles.splice(tileIndex, 1);
		tileDeck.push(tile);
		player.emit("tiles", player.userData.tiles);
		return true;
	} else{
		console.log(__line, "tile not found!")
		player.emit("tiles", player.userData.tiles);
		return false;
	}
}*/

function playersHaveTiles(){ //to check end conditions
	var i;
	var have = false;
	for(i=0; i<players.length; i += 1){
		if(players[i].userData.tiles.length > 0){
			have = true;
		}
	}
	return have;
}

function nextTurn(){
	currentTurn = (currentTurn + 1) % players.length;
	console.log("It is " + players[currentTurn].userData.userName + "'s turn!")
	message(players[currentTurn], "It is your turn!", gameColor);
	socket.emit('next turn',currentTurn);
}

function allSkipped(){
	var allSkipped = true; //check if everyone has skipped
	for(var i = 0; i < players.length; i++){
		if(!players[i].userData.skippedTurn){
			allSkipped = false;
		}
	}
	return allSkipped;
}

function checkEnd(){
	return (!playersHaveTiles() || allSkipped());
}

function gameEnd() {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message(io.sockets, "THE GAME HAS ENDED", gameColor);
	message(io.sockets, "Scores: ", gameColor);
	let total = 0;
	for( var i = 0; i < players.length; i += 1){
		/*for(var tile = 0; tile < players[i].userData.tiles.length; tile++){
			players[i].userData.score -= players[i].userData.tiles[tile].number;
		}*/
		message(io.sockets, players[i].userData.userName + ": " + players[i].userData.score + "\n", gameColor);
		total += players[i].userData.score;
	}
	message(io.sockets, "Total score: " + total, gameColor);
	
	io.emit('gameEnd');
	
	playerTradeMatrix = [];
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

//captures stack? to find and return line number
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