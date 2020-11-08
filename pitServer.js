//subtract tiles at end
//TODO: be able to turn in tiles and get new ones
//TODO: send current board state to new connections
//subtract remaining tiles

//TODO: deal cards on game restart

var express = require("express");
var http = require("http");
var io = require("socket.io");
var Deck = require('./htmlPit/js/Deck.js'); //get shared functions
var shared = require('./htmlPit/js/shared.js'); //get shared functions

//const spawn = require("child_process").spawn;

var app = express();
app.use(express.static("./htmlPit")); //working directory
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
//var yourTurnColor = "#0000ff";


console.log("Server Started!");

function defaultUserData(){
	return {
		userName: "Unknown",
		tiles: [],
		score: 0,
		statusColor: notReadyColor,
		ready: false,
		trades:[],
		bids:[],
		incomingTrades:[]
	}
}

var stolenCard = {message:"You don't own that card!"}

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
				console.log(__line, "found old player!", players[i].userData.userName, socket.userData.userName);
				var j = spectators.indexOf(socket);
				if(j >= 0){spectators.splice(j, 1)};
				socket.userData = players[i].userData;
				players[i] = socket;
				
			
				
				if(gameStatus === gameMode.PLAY){
					io.emit('startGame');
				}
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
            actilyGameEnd();
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
				actilyGameEnd();
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
            socket.userData.ready = ready.ready;
			if (socket.userData.ready === true) {
				socket.userData.statusColor = readyColor;
				updateBoard(socket, readyTitleColor , false);
			} else {
				socket.userData.statusColor = notReadyColor;
				updateBoard(socket, notReadyTitleColor , false);
			}
			console.log(__line,"" + socket.userData.userName + " is ready: " + ready.ready);
            updateUsers();
            checkStart();
        }
    });
	
	
	//happens when a player starts a bid  (changes right hand side)
	socket.on('submitedBidTiles',function(tileNumbers){
		//makes sure people actily have those cards
		if (checkCardOwner(socket,tileNumbers)!= undefined){
			socket.userData.bids.push(tileNumbers);
			updateUsers();
		}
	});
	
	//happens when a player answers another players bid (changes left hand side)
	socket.on('attemptTrade',function(tileNumbers, toPlayerNumber){
		if((toPlayerNumber >=0)&&(toPlayerNumber<players.length)){
			if (checkCardOwner(socket,tileNumbers)!= undefined){
				
				console.log(__line,"before matrix");
				printMatrix();
				
				//the player number of the socket (person attempting the trade
				fromPlayerNumber = players.indexOf(socket);
				if (fromPlayerNumber >= 0){
					playerTradeMatrix[toPlayerNumber][fromPlayerNumber].push(tileNumbers);
				}
				
				console.log(__line,"after matrix");
				printMatrix();
				
				//console.log(__line,'toPlayerNumber',toPlayerNumber,players[toPlayerNumber].userData.userName);
				players[toPlayerNumber].emit('tradeMatrix',playerTradeMatrix[toPlayerNumber]);
				//console.log(__line,playerTradeMatrix);
			}
		} else {
			console.log(__line,"invalid player number for trade!!!!!!!");
		}
	});
	
	//happens when original player accepts answer (changes both sides)
	socket.on('tradeReady',function(userNumber,placeNumber){
		if((userNumber >=0)&&(userNumber < players.length)){
			
			console.log(__line,"before matrix");
			printMatrix();
			
			let fromPlayerNumber = players.indexOf(socket);
			let fromPlayer = socket;
			let toPlayer = players[userNumber];
			
			let trade = playerTradeMatrix[fromPlayerNumber][userNumber].pop(); //TODO: make random?? also might get lost if trade response fails
			
			console.log(__line,"after matrix");
			printMatrix();
			
			if(trade != undefined){
				console.log(__line,'popped trade fromPlayerNumber',trade,fromPlayerNumber);
				//let length = trade.length - 1;
				//console.log(__line,'length',length);
				//console.log(__line,'toPlayer',toPlayer.userData.userName);
				//console.log(__line,'fromPlayer.userData.bids',fromPlayer.userData.bids);
				
				//Get from bid array
				let tradeResopnseNum = -1;
				for (let r = 0;r < fromPlayer.userData.bids.length;r++){
					if (fromPlayer.userData.bids[r].length == trade.length){
						tradeResopnseNum = r;
						break;
					}
				}
				if (tradeResopnseNum >= 0){
					let tradeResponse = fromPlayer.userData.bids.splice(tradeResopnseNum,1)[0];
					
					//print the trades
					var out = "" + tradeResponse + " from " + fromPlayer.userData.userName + "'s bid array    " + trade + " from " + players[userNumber].userData.userName + "'s matrix";
					
					console.log(__line,out);
					//console.log(__line,'trade',trade);
					//console.log(__line,'tradeResponse',tradeResponse);
					
					
					//for all cards being traded,
					for(var i = 0; i< tradeResponse.length; i++){
						var cardID1 = tradeResponse[i];
						
						//destroy invalid bids for player 1 (from player)
						for(var j = fromPlayer.userData.bids.length-1; j >= 0 ; j--){
							var bid = fromPlayer.userData.bids[j];
							for(var k = 0; k<bid.length; k++){
								if(cardID1 == bid[k]){ // if a bid has a card that is about to be traded, delete the bid
									fromPlayer.userData.bids.splice(j,1);
									break;
								}	
							}
						}
						
						//destroy invalid bids for player 2 (toPlayer)
						var cardID2 = trade[i]
						for(var j = toPlayer.userData.bids.length-1; j >= 0 ; j--){
							var bid = toPlayer.userData.bids[j];
							for(var k = 0; k<bid.length; k++){
								if(cardID2 == bid[k]){ // if a bid has a card that is about to be traded, delete the bid
									toPlayer.userData.bids.splice(j,1);
									break;
								}	
							}
						}
						
						//destroy all invalid trades in the trade matrix  (could be optimized)
						
						for(var l=0; l<players.length; l++){
							for(var m=0; m<players.length; m++){
								var tradeArray = playerTradeMatrix[l][m];
								for(var j = tradeArray.length-1; j >= 0 ; j--){
									var bid = tradeArray[j];
									for(var k = 0; k<bid.length; k++){
										if((cardID1 == bid[k])||(cardID2==bid[k])){ // if a bid has a card that is about to be traded, delete the bid
											tradeArray.splice(j,1);
											break;
										}	
									}
								}
							}
						}
					}
					
					
					console.log(__line, "After deleting from trade Matrix");
					printMatrix();
					
					//swap cards in trade

					for (var x = 0;x < tradeResponse.length;x++){
						//get tile
						let tileNumber = toPlayer.userData.tiles.indexOf(trade[x]);
						//store tile
						let temp = toPlayer.userData.tiles[tileNumber];
						//swap
						toPlayer.userData.tiles[tileNumber] = tradeResponse[x];
						tileNumber = socket.userData.tiles.indexOf(tradeResponse[x]);
						socket.userData.tiles[tileNumber] = temp;
					}
					
					//send bids to all
					updateUsers();
					//send new tiles and trade matrix to users
					sendTilesToPlayer(socket);
					sendTilesToPlayer(toPlayer);
					toPlayer.emit('tradeMatrix',playerTradeMatrix[userNumber]);
					socket.emit('tradeMatrix',playerTradeMatrix[fromPlayerNumber]);
					
					// send trade message to user
					message(toPlayer,'Traded with '+socket.userData.userName,gameColor);
					message(socket,'Traded with '+ toPlayer.userData.userName,gameColor);
				} else {
					console.log("No valid matching bids !!!!!");
				}
			} else {
				console.log("No trades left in player trade matrix !!!!!!");
			}
		} else {
			console.log("invalid user number !!!!!!!!");
		}
	});
	
	socket.on('cheakEndOfRound',function(){
		var add = cheakWin(socket.userData.tiles);
		console.log(__line,'check end of round for ', socket.userData.userName,socket.userData.tiles);
		if(add!= 0){
			newRound(socket,add);
		}
	});
});

function printMatrix(){
	var pad = 30;
	var namePad=10; //min 3
	
	//first column is names
	playerList = "1\\2".padStart(namePad);
	for(var i = 0; i< players.length;i++){
		playerList += players[i].userData.userName.padStart(pad);	
	}
	
	console.log(playerList);
	
	for(var i = 0; i< players.length;i++){
		//name column
		var out = "";
		var name = "" + players[i].userData.userName;
		out += name.padStart(namePad);
		
		
		for(var j=0; j<playerTradeMatrix[i].length; j++){
			var arr = "";
			for(var k=0; k<playerTradeMatrix[i][j].length; k++){
				arr+='[';
				arr += playerTradeMatrix[i][j][k];
				arr += ']'
			}
			arr+='|';
			
			out += arr.padStart(pad);
		}
		console.log(out);
		
	}
}


function newRound(socket,add){
	console.log(__line,'user check',socket !== undefined);
	if (socket !== undefined){ 
		message(io.sockets,socket.userData.userName + ' won that round',gameColor);
		socket.userData.score += add;
		updateUsers();
		if (socket.userData.score >= 50){
			return actilyGameEnd(socket);
		}
	}
	playerTradeMatrix = [];
	message(io.sockets, "A NEW ROUND HAS STARTED", gameColor);
	
	//clear trades and bids
	players.forEach(function(player){
		player.userData.trades = [];
		player.userData.tiles = [];
		player.userData.bids = [];
		player.userData.incomingTrades = [];
		players.forEach(function (p){player.userData.incomingTrades.push(new Array())});
		playerTradeMatrix.push(player.userData.incomingTrades);
		
		player.emit('tradeMatrix',player.userData.incomingTrades);
	});
	
	updateBoard(io.sockets, readyTitleColor, true);
	console.log(__line,'p',players.length);
	
	//deal new cards
	var discription = shared.cardDes
	console.log(discription);
	discription.products = shared.cardDes.products.slice(0,players.length);
	tiles = new Deck(discription); //deck to deal to players
	var pile = new Array(tiles.totalCards);
	for (var i = 0; i < pile.length; i++){ pile[i]=i;}
	
	//print all tiles
	for (var i = 0; i < pile.length; i++){
		console.log(__line,'cards',pile[i],tiles.getProperties(pile[i]));
	}
	
	//console.log(__line, "cards", pile) ;
	//console.log(__line, "cards", tiles);
	dealAllTiles(players,pile);
	sendTilesToAllPlayers(players);
	//console.log(__line, "cards", tiles);
	//console.log(__line, "allTiles", allTiles);
	updateUsers();
}

function cheakWin(tilesToCheak){
	deck = new Deck( shared.cardDes);
	cardCount = {};
	shared.cardDes.products.forEach((i)=>{
		cardCount[i.name] = {card:i,count:0};
	});
	
	tilesToCheak.forEach((i)=>{
		var cardProp = deck.getProperties(i);
		console.log(__line,i,cardProp);
		if (cardProp.products != undefined){
			cardCount[cardProp.products.name].count++;
		}
	});
	console.log(__line,'cardCount',cardCount);
	var add = 0;
	Object.keys(cardCount).forEach((i)=>{
		//console.log(__line,cardCount[i]);
		//console.log(__line,cardCount[i].count);
		if (cardCount[i].count>=9){
			//console.log(__line,'should be in there',cardCount[i].card.value);
			add = cardCount[i].card.value;
		}
	});
	return add;
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
			console.warn(__line, e.message);
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
	let bids = [0,0,0,0];
	client.userData.bids.forEach((b)=>{
		bids[b.length-1]++;
	});
	let trades = [0,0,0,0];
	client.userData.trades.forEach((b)=>{
		trades[b.length-1]++;
	});
	return{
		id: client.id,
		userName: client.userData.userName,
		color: client.userData.statusColor,
		score: client.userData.score,
		ready: client.userData.ready,
		incomingTrades: client.userData.incomingTrades,
		bids,trades
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
    if( gameStatus === gameMode.LOBBY) {
        var readyCount = 0;
        allClients.forEach(function(client) {
            if( client.userData.ready ) {
                readyCount++;
            }
        });
        if(readyCount == allClients.length && readyCount >= minPlayers) {
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
		}
	});
	//wait for turn plays
	io.emit('startGame');
	newRound(undefined,undefined);
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
	if(carddeck.length > 0){
		tileToGive = chooseRandomTile(carddeck);
		//tileToGive.owner = player.id;
		player.userData.tiles.push(tileToGive);
	}
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
	}
}

/*
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
*/

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
	
	if(winner != undefined){
		message(io.sockets,'The winner is ' + winner.userData.userName +'!',gameColor);
	}
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