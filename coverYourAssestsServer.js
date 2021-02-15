var express = require("express");
var http = require("http");
var io = require("socket.io");
var shared = require('./htmlCoverYourAssests/js/shared.js');
var deckClass = require('./htmlCoverYourAssests/js/deck.js')
var cardsInFaceUpPile = [];
var deck = new deckClass(shared.makeDeck().Deck);
var noCardsLeft = false;
var stealAtemptInProgress = false;

var app = express();
app.use(express.static("./htmlCoverYourAssests")); //working directory
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
var originalCurrentTurn = undefined;
var biddingPile = [];
var biddingTurn = 'defendent';

console.log("Server Started!");

function defaultUserData(){
	return {
		userName: "Unknown",
		tiles: [],
		statusColor: notReadyColor,
		ready: false,
		score:0,
		cardsPlayedDown: [],
		oponint: false,
		defendent: false
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
				currentTurn = currentTurn % players.length;
				updateUsers();
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
	
	socket.on('tradeInCards',function(cards){
		let cardsSelected = 0;
		let cardsSelect = [];
		for(let i = 0;i < cards.length;i++){
			if(cards[i].selected){
				cardsSelected++;
				cardsSelect.push(cards[i].cardNumb);
			}
		}
		if(cardsSelected == 0){
			let myStatus = undefined;
			if(socket.userData.defendent){
				myStatus = 'defendent';
			}else{
				if(socket.userData.oponint){
					myStatus = 'oponint';
				}
			}
			if(myStatus == 'oponint' || myStatus == 'defendent'){
				if(myStatus == biddingTurn){
					let player = undefined;
					for(let x = 0;x < players.length;x++){
						//console.log(biddingTurn,players[x].userData)
						if(players[x].userData.defendent && biddingTurn == 'oponint'){
							player = players[x];
						}else{
							if(players[x].userData.oponint && biddingTurn == 'defendent'){
								player = players[x];
							}
						}
					}
					//console.log(player.userData);
					player.userData.cardsPlayedDown.push(biddingPile);
					biddingPile = [];
					nextTurn();
					updateUsers();
					stealAtemptInProgress = false;
					biddingTurn = 'defendent';
				}else{
					message(socket,'it is not your turn to defend',gameErrorColor);
				}
			}else{
				message(socket,'you are not a player in this steal attemt',gameErrorColor);
			}
		}else{
			if(players[currentTurn].id == socket.id){
				if(cardsSelected == 2){
					if((deck.getProperties(cardsSelect[0]).comonity == 'Gold' || deck.getProperties(cardsSelect[0]).comonity == 'Silver') && (deck.getProperties(cardsSelect[1]).comonity == 'Gold' || deck.getProperties(cardsSelect[1]).comonity == 'Silver')){
						message(socket,'you cannot play only gold and silver',gameErrorColor);
					}else{
						//console.log(deck.getProperties(cardsToPush[0]).comonity);
						if(deck.getProperties(cardsSelect[0]).comonity == deck.getProperties(cardsSelect[1]).comonity || deck.getProperties(cardsSelect[0]).comonity == 'Gold' || deck.getProperties(cardsSelect[0]).comonity == 'Silver' || deck.getProperties(cardsSelect[1]).comonity == 'Gold' || deck.getProperties(cardsSelect[1]).comonity == 'Silver'){
							//console.log(__line,'we are in here')
							socket.userData.cardsPlayedDown.push(cardsSelect);
							cardsSelect.forEach(function(card){
								socket.userData.tiles.splice(socket.userData.tiles.indexOf(card),1);
							});
							nextTurn();
							socket.emit('cards',socket.userData.tiles)
							socket.emit('discarded',cardsInFaceUpPile[cardsInFaceUpPile.length - 1]);
						}else{
							message(socket,'you must play two cards of the same comonity',gameErrorColor);
						}
					}
				}else{
					message(socket,'you can only play down 2 cards',gameErrorColor);
				}
			}else{
				message(socket,'it is not your turn',gameErrorColor);
			}
		}
	});
	
	socket.on('picking',function(cards){
		if(players[currentTurn].id == socket.id){
			let cardsSelected = [];
			for(let i = 0;i < cards.length;i++){
				if(cards[i].selected){
					cardsSelected.push(cards[i].cardNumb);
				}
			}
			if(cardsSelected.length == 1){
				let selected = deck.getProperties(cardsSelected[0]).comonity;
				let faceUp = deck.getProperties(cardsInFaceUpPile[cardsInFaceUpPile.length - 1]).comonity;
				if((faceUp == 'Gold' || faceUp == 'Silver') && (selected == 'Gold' || selected == 'Silver')){
					message(socket,'you have to include 1 card that is not gold or silver',gameErrorColor);
				}else{
					if(selected == faceUp || selected == 'Gold' || selected == 'Silver' || faceUp == 'Gold' || faceUp == 'Silver'){
						let newSet = [];
						//console.log('waho we are in here');
						newSet.push(cardsInFaceUpPile[cardsInFaceUpPile.length - 1]);
						cardsInFaceUpPile.splice(cardsInFaceUpPile.length - 1,1);
						newSet.push(cardsSelected[0]);
						socket.userData.tiles.splice(socket.userData.tiles.indexOf(cardsSelected[0]),1);
						socket.userData.cardsPlayedDown.push(newSet);
					}else{
						socket.userData.tiles.splice(socket.userData.tiles.indexOf(cardsSelected[0]),1);
						cardsInFaceUpPile.push(cardsSelected[0]);
						dealTiles(socket.userData.tiles,1);
					}
					socket.emit('cards',socket.userData.tiles);
					io.sockets.emit('discarded',cardsInFaceUpPile[cardsInFaceUpPile.length - 1]);
					nextTurn();
				}
			}else{
				message(socket,'you can only discard 1 card',gameErrorColor);
			}
		}else{
			message(socket,'it is not your turn',gameErrorColor);
		}
	});
	
	socket.on('stealingCard',function(cards){
		if(players[currentTurn].id == socket.id){
			if(!stealAtemptInProgress){
				if(socket.userData.cardsPlayedDown.length > 0){
					let cardsSelected = [];
					for(let i = 0;i < cards.cards.length;i++){
						if(cards.cards[i].selected){
							cardsSelected.push(cards.cards[i].cardNumb);
						}
					}
					if(cardsSelected.length == 1){
						let playValed = false;
						let player = undefined;
						for(let y = 0;y < players.length;y++){
							if(players[y].id == cards.player){
								players[y].userData.defendent = true;
								if(players[y].userData.cardsPlayedDown.length > 1){
									playValed = true;
									player = players[y];
								}
							}
						}
						if(playValed){
							let pileValueFound = undefined;
							player.userData.cardsPlayedDown[player.userData.cardsPlayedDown.length - 1].forEach(function(card){
								if(deck.getProperties(card).comonity != 'Gold' && deck.getProperties(card).comonity != 'Silver'){
									pileValueFound = deck.getProperties(card).comonity;
								}
							});
							//console.log(pileValueFound,deck.getProperties(cardsSelected[0]));
							if(deck.getProperties(cardsSelected[0]).comonity == 'Gold' || deck.getProperties(cardsSelected[0]).comonity == 'Silver' || deck.getProperties(cardsSelected[0]).comonity == pileValueFound){
								//console.log(pileValueFound)
								biddingPile.push(cardsSelected[0]);
								socket.userData.tiles.splice(socket.userData.tiles.indexOf(cardsSelected[0]),1);
								player.userData.cardsPlayedDown[player.userData.cardsPlayedDown.length - 1].forEach(function(card){
									biddingPile.push(card);
								});
								player.userData.cardsPlayedDown.splice(player.userData.cardsPlayedDown.length - 1,1);
								socket.userData.oponint = true;
								updateUsers();
								socket.emit('cards',socket.userData.tiles);
								io.sockets.emit('discarded',cardsInFaceUpPile[cardsInFaceUpPile.length - 1]);
								stealAtemptInProgress = true;
								message(player,socket.userData.userName + ' is stealing ' + pileValueFound + ' from you',gameColor);
							}else{
								message(socket,'you have to use a card of the same comonity or gold or silver to steal',gameErrorColor);
							}
						}else{
							message(socket,'you can only steal from people with more than 1 card',gameErrorColor);
						}
					}else{
						message(socket,'you can only steal with one card at a time',gameErrorColor)
					}
				}else{
					message(socket,'you must have at least 1 set down to steal', gameErrorColor);
				}
			}else{
				message(socket,'there is already a person stealing',gameErrorColor);
			}
		}else{
			message(socket,'it is not your turn',gameErrorColor);
		}
	});
	
	socket.on('defending',function(cards){
		let myStatus = undefined;
		if(socket.userData.defendent){
			myStatus = 'defendent';
		}else{
			if(socket.userData.oponint){
				myStatus = 'oponint';
			}
		}
		if(myStatus != undefined){
			if(myStatus == biddingTurn){
				let cardsSelected = [];
				for(let i = 0;i < cards.length;i++){
					if(cards[i].selected){
						cardsSelected.push(cards[i].cardNumb);
					}
				}
				if(cardsSelected.length == 1){
					let pileValueFound = undefined;
					biddingPile.forEach(function(card){
						if(deck.getProperties(card).comonity != 'Gold' && deck.getProperties(card).comonity != 'Silver'){
							pileValueFound = deck.getProperties(card).comonity;
						}
					});
					if(deck.getProperties(cardsSelected[0]).comonity == pileValueFound || deck.getProperties(cardsSelected[0]).comonity == 'Gold' || deck.getProperties(cardsSelected[0]).comonity == 'Silver'){
						biddingPile.push(cardsSelected[0]);
						socket.userData.tiles.splice(socket.userData.tiles.indexOf(cardsSelected[0]),1);
						if(biddingTurn = 'defendent'){
							biddingTurn = 'oponint';
						}else{
							biddingTurn = 'defendent'
						}
						updateUsers();
						socket.emit('cards',socket.userData.tiles);
						let otherPlayer = undefined;
						players.forEach(function(player){
							if(myStatus == 'defendent'){
								if(player.userData.oponint){
									otherPlayer = player;
								}
							}else{
								if(player.userData.defendent){
									otherPlayer = player;
								}
							}
						});
						message(otherPlayer,socket.userData.userName + ' defended with a ' + pileValueFound,gameColor);
					}else{
						message(socket,'you have to defend with a card that is the same comonity as the one tring to be stolan',gameErrorColor);
					}
				}else{
					message(socket,'you can only defend with one card at a time',gameErrorColor);
				}
			}else{
				message(socket,'it is not your turn to defend',gameErrorColor)
			}
		}else{
			message(socket,'you are not the defendent or the oponint',gameErrorColor)
		}
	});
});

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
		score: client.userData.score,
		ready: client.userData.ready,
		cardsPlayedDown:client.userData.cardsPlayedDown[client.userData.cardsPlayedDown.length - 1],
		thisLength:client.userData.cardsPlayedDown.length,
		oponint:client.userData.oponint,
		defendent:client.userData.defendent,
		biddingPile:biddingPile
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

function gameStart() {
	players = [];
	spectators = [];
	gameStatus = gameMode.PLAY;
	dealTiles(cardsInFaceUpPile,1);
	
	allClients.forEach(function(client){
		if(client.userData.ready){
			client.userData.statusColor = notYourTurnColor;
			client.userData.tiles = [];
			client.userData.score = 0;
			client.userData.cardsPlayedDown = [];
			players.push(client);
		} else {
			client.userData.statusColor = spectatorColor;
			spectators.push(client);
		}
	});
	//console.log(players);
	
	nextRound();
	updateBoard(io.sockets, readyTitleColor, true);
	updateTurnColor();
	io.emit('startGame');
	io.emit('addComitysToSideBar');
}

function nextRound(){
	if(!updateScore()){
		deck = new deckClass(shared.makeDeck().Deck);
		for(let x = 0;x < deck.pile.length;x++){
			let comonity = deck.getProperties(deck.pile[x]).comonity;
			let repeat = deck.getProperties(deck.pile[x]).repeat;
			if(comonity == 'Gold' && repeat > 4){
				deck.pile.splice(x,1);
			}else{
				if(comonity == 'Silver' && repeat > 8){
					deck.pile.splice(x,1);
				}else{
					if(comonity == 'Home' && repeat > 8){
						deck.pile.splice(x,1);
					}
				}
			}
		}
		cardsInFaceUpPile = [];
		dealTiles(cardsInFaceUpPile,1);
		//console.log(__line,players);
		currentTurn = Math.floor(Math.random() * players.length);
		//console.log(__line,currentTurn,players);
		players.forEach(function(player){
			player.userData.tiles = [];
			player.userData.cardsPlayedDown = [];
			player.userData.oponint = false;
			player.userData.defendent = false;
			player.userData.skiped = false;
			dealTiles(player.userData.tiles,5);
			player.emit('cards',player.userData.tiles);
			player.emit('discarded',cardsInFaceUpPile[cardsInFaceUpPile.length - 1]);
		});
		nextTurn();
		originalCurrentTurn = currentTurn;
		updateBoard(io.sockets, readyTitleColor, true);
		updateTurnColor();
	}
	
}

function updateScore(){
	players.forEach(function(player){
		let totalScore = 0;
		player.userData.cardsPlayedDown.forEach(function(pile){
			for(let x = 0;x < pile.length;x++){
				let y = deck.getProperties(pile[x]).comonity;
				totalScore += shared.makeDeck().comonityValues[y];
			}
		});
		player.userData.score += totalScore;
	});
	return checkEnd();
}

function dealTiles(array,amount){
	if(deck.pile.length != 0){
		let x = deck.deal(amount);
		for(y = 0;y < x.length;y++){
			array.push(x[y]);
		}
	}
}

function checkEnd(){
	let scoresToWin = [];
	players.forEach(function(player){
		if(player.userData.score >= 100){
			scoresToWin.push(player.userData.score);
		}
	});
	if(scoresToWin.length > 0){
		let winningScore = Math.max(...scoresToWin);
		let winningPlayer = undefined;
		players.forEach(function(player){
			if(player.userData.score == winningScore){
				winningPlayer = player;
			}
		});
		actuilyGameEnd(winningPlayer);
		return true;
	}
}

function gameEnd() {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message(io.sockets, "THE GAME HAS ENDED", gameColor);
	io.emit('gameEnd');
	
    players = [];
	spectators = [];
    allClients.forEach(function(client) {
        client.userData.ready = false;
        client.userData.statusColor = notReadyColor;
    });
    gameStatus = gameMode.LOBBY;
	io.emit('gameEnd')
    updateUsers();
}

function actuilyGameEnd(winner) {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message(io.sockets, "THE GAME HAS ENDED", gameColor);
	let scores = '';
	players.forEach(function(player){
		message(io.sockets,player.userData.userName + ': ' + player.userData.score + 'K',gameColor);
	});
	message(io.sockets,'The winner is ' + winner.userData.userName +'!',gameColor);
	io.emit('gameEnd');
	
    players = [];
	spectators = [];
    allClients.forEach(function(client) {
		client.userData.score = 0;
        client.userData.ready = false;
        client.userData.statusColor = notReadyColor;
    });
    gameStatus = gameMode.LOBBY;
    updateUsers();
}

function restoreCards(){
	if(deck.pile.length == 0){
		noCardsLeft = true;
	}else{
		players.forEach(function(player){
			dealTiles(player.userData.tiles,5 - player.userData.tiles.length);
			player.emit('cards',player.userData.tiles);
			player.emit('discarded',cardsInFaceUpPile[cardsInFaceUpPile.length - 1]);
		});
		message(io.sockets,deck.pile.length + ' cards left',gameColor)
		message(io.sockets,'cards replenished',gameColor);
	}
	updateUsers();
}

function nextTurn(){
	//console.log(players)
	players.forEach(function(player){
		player.userData.oponint = false;
		player.userData.defendent = false;
	});
	//console.log(__line,currentTurn,players)
	currentTurn = (currentTurn + 1) % players.length;
	console.log(currentTurn);
	
	if(currentTurn == originalCurrentTurn){
		restoreCards();
	}
	let playersSkipped = 0;
	players.forEach(function(player){
		if(player.userData.tiles.length == 0){
			playersSkipped++
		}
	});
	if(playersSkipped == players.length){
		nextRound();
	}else{
		if(players[currentTurn].userData.tiles.length == 0){
			nextTurn();
		}else{
			message(players[currentTurn], "It is your turn!", gameColor);
			updateTurnColor();
			updateUsers();
		}
	}
	//console.log(__line,currentTurn);
	
	//console.log("It is " + players[currentTurn].userData.userName + "'s turn!")
	
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