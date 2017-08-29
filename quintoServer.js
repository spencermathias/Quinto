//TODO: be able to turn in tiles and get new ones
//TODO: send current board state to new connections
//subtract remaining tiles

var express = require("express");
var http = require("http");
var io = require("socket.io");
//const spawn = require("child_process").spawn;

var app = express();
app.use(express.static("./quinto")); //working directory
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

var currentTurn = 0;

var boardRows = 13;
var boardColumns = 17;
var boardState = [];

var numberOfTilesForHand = 5;

var tileDesc = {
    zeros: 7,
	ones: 6,
	twos: 6,
	threes: 7,
	fours: 10,
	fives: 6,
	sixes: 10,
	sevens: 14,
	eights: 12,
	nines: 12
};
var blankTile = {owner: "board", number: -1, id: -1};
var tiles = [];
var allTiles = [];

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
		score: 0,
		statusColor: notReadyColor,
		ready: false,
		skippedTurn: false
	}
}

io.sockets.on("connection", function(socket) {
    socket.userData = defaultUserData();

    allClients.push(socket);
    if (gameStatus === gameMode.LOBBY) {
        socket.userData.statusColor = notReadyColor;
    } else {
        socket.userData.statusColor = spectatorColor;
        updateBoard(socket, notReadyTitleColor, true);
    }

	message(socket, "Connection established!", serverColor)

    console.log(__line, "Socket.io Connection with client " + socket.id +" established");

    socket.on("disconnect",function() {
		message( io.sockets, "" + socket.userData.userName + " has left.", serverColor);
        console.log(__line,"disconnected: " + socket.userData.userName + ": " + socket.id);
        var i = allClients.indexOf(socket);
        allClients.splice(i, 1);
        i = players.indexOf(socket);
        if(i >= 0){players.splice(i, 1);}
		if( players.length < minPlayers) {
			gameEnd();
		} else {
			updateUsers();
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
				var i = players.indexOf(socket);
				socket.userData.statusColor = notReadyColor;
				updateBoard(socket, notReadyTitleColor , false);
			}
            checkStart();
			console.log(__line,"" + socket.userData.userName + " is ready: " + ready.ready);
            updateUsers();
        }
    });
	
	socket.on("newBoardState", function(newBoardState){
		if (gameStatus === gameMode.PLAY){
			if( players[currentTurn%players.length].id === socket.id ){
				validTilesToPlay(socket, newBoardState);
			} else {
				message(socket, "It is not your turn!", gameErrorColor);
			}
		} else {
			message(socket, "Game not in mode to recieve play", gameErrorColor);
		}
	});
});

function nextTurn(){
	currentTurn = (currentTurn + 1) % players.length;
	if(players[currentTurn].userData.tiles.length != 0){
		console.log("It is " + players[currentTurn].userData.userName + "'s turn!")
		message(players[currentTurn], "It is your turn!", gameColor);
	} else {
		players[currentTurn].userData.skippedTurn = true;
		if(checkEnd()){gameEnd();} else {nextTurn();}
	}
	if(checkEnd()){gameEnd();}
}

function message(socket, message, color){
	var messageObj = {
		data: "" + message,
		color: color
	};
	socket.emit('message',JSON.stringify(messageObj));
}

function updateUsers() {
    console.log(__line,"--------------Sending New User List--------------");
    var userList = [];
    allClients.forEach(function(client){
        console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "|status:", client.userData.statusColor, "|score:", client.userData.score);
		userList.push({
            id: client.id,
            userName: client.userData.userName,
            color: client.userData.statusColor,
			score: client.userData.score
        });
    });
    io.sockets.emit("userList", userList);
    console.log(__line,"----------------Done Sending List----------------");
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
	var i;
	players = [];
    for (i = 0; i < allClients.length; i += 1) {
		if (allClients[i].userData.ready){
			players.push(allClients[i]);
		}
    }
	for (i = 0; i < players.length; i += 1){
        console.log(__line, "  player"+ i +": " + players[i].userData.userName);
	}
    console.log(__line, "playerCount: " + players.length);
    console.log(__line,"gameStatus: " + gameStatus);
    if( players.length >= minPlayers && gameStatus === gameMode.LOBBY) {
        var startGame = true;
        allClients.forEach(function(client) {
            if( client.userData.ready === false) {
                startGame = false;
            }
        });
        if(startGame) {
            gameStart();
        }
    }
}

function gameStart() {
	console.log(__line,"gameStart");
	message(io.sockets, "THE GAME HAS STARTED", gameColor);
	gameStatus = gameMode.PLAY;
	//reset colors
	allClients.forEach(function(client) {
		if ( client.userData.ready === true ) {
			client.userData.statusColor = notYourTurnColor;
			client.userData.tiles = [];
			client.userData.score = 0;
			client.userData.skippedTurn = false;
		} else {
			client.userData.statusColor = spectatorColor;
		}
	});
	setUpBoard();
	updateBoard(io.sockets, readyTitleColor, true);
	currentTurn = Math.floor(Math.random()*players.length); //random starting person

	console.log(__line,players[currentTurn%players.length].userData.userName + " starts the game!");
	message(io.sockets, players[currentTurn%players.length].userData.userName + " starts the game!", gameColor);
	
    tiles = makeTiles(); //deck to deal to players
	//console.log(__line, "cards", tiles);
	allTiles = [];
	for(var i =0; i < tiles.length; i++){
		allTiles.push(tiles[i]); //deck to reference cards
	}
	//console.log(__line, "alltiles", allTiles);
	
	players.forEach(function(player) {
		//player.userData.tiles = [];
		dealTiles(player, numberOfTilesForHand);
		//console.log(__line, "player", player.userData.name,player.userData.tiles);
	});
	
	//console.log(__line, "cards", tiles);
	//console.log(__line, "allTiles", allTiles);

	updateTurnColor();
	//wait for turn plays
}

function setUpBoard(){ //set all positions on the board to -1 to indicate no tile
	var row;
	var column;
	boardState = [];
	var boardRow;
	for (row = 0; row < boardRows; row++){
		boardRow = [];
		for (column = 0; column < boardColumns; column++){
			boardRow.push(blankTile);
		}
		boardState.push(boardRow);
	}
	sendBoardState();
}

function sendBoardState(){
	io.sockets.emit("boardState", boardState);
}

function makeTiles() {
    var cards = [];
	var i;
	var tileId = 0;

	for (i = 0; i < tileDesc.zeros; i+=1) {
        cards.push({owner: "deck", number: 0, id: tileId++});
    }
    for (i = 0; i < tileDesc.ones; i+=1) {
        cards.push({owner: "deck", number: 1, id: tileId++});
    }
	for (i = 0; i < tileDesc.twos; i+=1) {
        cards.push({owner: "deck", number: 2, id: tileId++});
    }
	for (i = 0; i < tileDesc.threes; i+=1) {
        cards.push({owner: "deck", number: 3, id: tileId++});
    }
	for (i = 0; i < tileDesc.fours; i+=1) {
        cards.push({owner: "deck", number: 4, id: tileId++});
    }
	for (i = 0; i < tileDesc.fives; i+=1) {
        cards.push({owner: "deck", number: 5, id: tileId++});
    }
	for (i = 0; i < tileDesc.sixes; i+=1) {
        cards.push({owner: "deck", number: 6, id: tileId++});
    }
	for (i = 0; i < tileDesc.sevens; i+=1) {
        cards.push({owner: "deck", number: 7, id: tileId++});
    }
	for (i = 0; i < tileDesc.eights; i+=1) {
        cards.push({owner: "deck", number: 8, id: tileId++});
    }
	for (i = 0; i < tileDesc.nines; i+=1) {
        cards.push({owner: "deck", number: 9, id: tileId++});
    }
    return cards;
}

function dealTiles(player, amountToBeDelt) {
	var tileToGive;
	var i;
	for( i = 0; i < amountToBeDelt; i+=1) {
		if(tiles.length > 0){
			tileToGive = chooseRandomTile();
			tileToGive.owner = player.id;
			player.userData.tiles.push(tileToGive);
		}
	}
	player.emit("tiles", player.userData.tiles);
	message(io.sockets, tiles.length + " tiles left", gameColor);
}

function chooseRandomTile() {
	if(tiles.length > 0){
		var index = Math.floor(Math.random() * tiles.length);
		var returnTile = tiles[index];
		tiles.splice(index, 1);
		return returnTile;
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

function checkNeighbors(oldboard,row,col){
	var isConnected = false
	//check center
	var centerRow = (boardRows-1)/2;
	var centerCol = (boardColumns-1)/2;
	//console.log(__line, "row", row, "centerRow" , centerRow);
	//console.log(__line, "col", col, "centerCol" , centerCol);
	if(row == centerRow && col == centerCol){isConnected = true;}
	//check upper
	upperRow = row - 1;
	if(upperRow < 0){upperRow = row;} else {
		if(oldboard[upperRow][col].owner != blankTile.owner) {isConnected = true;}
	}
	//check left
	leftCol = col - 1;
	if(leftCol < 0){leftCol = col;} else {
		if(oldboard[row][leftCol].owner != blankTile.owner) {isConnected = true;}
	}
	//check lower
	lowerRow = row + 1;
	if(lowerRow > boardRows-1){lowerRow = row;} else {
		if(oldboard[lowerRow][col].owner != blankTile.owner) {isConnected = true;}
	}
	//check right
	rightCol = col + 1;
	if(rightCol > boardColumns-1){rightCol = col;} else {
		if(oldboard[row][rightCol].owner != blankTile.owner) {isConnected = true;}
	}
	//console.log(__line, "is connected", isConnected);
	return isConnected;
}

function validTilesToPlay(player, submittedBoardState) {
	//at least one section must contain an old tile or the origin
	//played tiles must be in a single row or column
	//cannot have empty gap between played tiles
	//sections that contain a played tile must add to a multiple of 5
	var score = 0;
	var corrected = ensureSubmittedIsPhysicallyPossible(player, submittedBoardState);
	var skipped = corrected.changedTiles.length == 0;
	if(!corrected.error){
		//split board up into sections that contain newly played tiles
		//var allConnect = true;
		var rowSections = [];
		for(var row = 0; row < corrected.boardState.length; row++){
			var sections = [];
			var containsNew = false;
			//var subConnect = false;
			var subsection = [];
			for(var col = 0; col < corrected.boardState[row].length; col++){
				if(corrected.boardState[row][col].id != blankTile.id){
					subsection.push({pos: {row: row, col:col}, tile: corrected.boardState[row][col]});
					if(corrected.changedTiles.indexOf(corrected.boardState[row][col]) >= 0){
						containsNew = true;
					}
					// if(checkNeighbors(boardState, row, col)){
						// subConnect = true;
					// }
				} else {
					if(subsection.length > 0 && containsNew){
						//if(!subConnect){allConnect = false;}
						sections.push(subsection);
					}
					subsection = [];
					containsNew = false
					subConnect = false;
				}
			}
			if(subsection.length > 0 && containsNew){ //takes care of edge case
				//if(!subConnect){allConnect = false;}
				sections.push(subsection);
			} 
			rowSections.push(sections);
		}
		
		var colSections = [];
		for(var col = 0; col < corrected.boardState[0].length; col++){
			var sections = [];
			var containsNew = false;
			var subConnect = false;
			//var subsection = [];
			for(var row = 0; row < corrected.boardState.length; row++){
				if(corrected.boardState[row][col].id != blankTile.id){
					subsection.push({pos: {row: row, col:col}, tile: corrected.boardState[row][col]});
					if(corrected.changedTiles.indexOf(corrected.boardState[row][col]) >= 0){
						containsNew = true;
					}
					// if(checkNeighbors(boardState, row, col)){
						// subConnect = true;
					// }
				} else {
					if(subsection.length > 0 && containsNew){
						//if(!subConnect){allConnect = false;}
						sections.push(subsection);
					}
					subsection = [];
					containsNew = false
					subConnect = false;
				}
			}
			if(subsection.length > 0 && containsNew){ //takes care of edge case
				//if(!subConnect){allConnect = false;}
				sections.push(subsection);
			} 
			colSections.push(sections);
		}
		//console.log(__line,"rowSections",rowSections);
		//console.log(__line,"colSections",colSections);
		/*
		for(var i = 0; i < rowSections.length; i++){
			console.log(__line, "row " + i + ":")
			for(var j = 0; j < rowSections[i].length; j++){
				console.log(__line, rowSections[i][j]);
			}
		}
		for(var i = 0; i < colSections.length; i++){
			console.log(__line, "col " + i + ":")
			for(var j = 0; j < colSections[i].length; j++){
				console.log(__line, colSections[i][j]);
			}
		}*/
		
		var space = false;
		var multipleOfFive = true;
		var oneRunIsLongerThanOne = false;
		var runsShoterThanSix = true;
		var allRunsLongerThanOneConnectToOldBoard = true;
		var subscore;
		for(var row = 0; row < rowSections.length; row++){
			if(rowSections[row].length > 1){space = true;}
			subscore = 0;
			if(rowSections[row].length > 0){
				if(rowSections[row][0].length > 1){
					oneRunIsLongerThanOne = true;
					if(rowSections[row][0].length > numberOfTilesForHand){
						runsShoterThanSix = false;
					}
					var groupConnects = false;
					for(var i = 0; i < rowSections[row][0].length; i++){
						subscore += rowSections[row][0][i].tile.number;
						if(checkNeighbors(boardState, rowSections[row][0][i].pos.row, rowSections[row][0][i].pos.col)){
							groupConnects = true;
						}
					}
					if (!groupConnects){
						allRunsLongerThanOneConnectToOldBoard = false;
					}
				}
			}
			if(subscore % numberOfTilesForHand == 0){
				score += subscore;
			} else {
				multipleOfFive = false;
			}
		}
		
		for(var col = 0; col < colSections.length; col++){
			if(colSections[col].length > 1){space = true;}
			subscore = 0;
			if(colSections[col].length > 0){
				if(colSections[col][0].length > 1){
					oneRunIsLongerThanOne = true;
					if(colSections[col][0].length > numberOfTilesForHand){
						runsShoterThanSix = false;
					}
					var groupConnects = false;
					for(var i = 0; i < colSections[col][0].length; i++){
						subscore += colSections[col][0][i].tile.number;
						if(checkNeighbors(boardState, colSections[col][0][i].pos.row, colSections[col][0][i].pos.col)){
							groupConnects = true;
						}
					}
					if (!groupConnects){
						allRunsLongerThanOneConnectToOldBoard = false;
					}
				}
			}
			if(subscore % numberOfTilesForHand == 0){
				score += subscore;
			} else {
				multipleOfFive = false;
			}
		}
		if(space){
			score = -1;
			message(player, "Spaces are not allowed between played tiles!", gameErrorColor);
			console.log(__line, "Spaces are not allowed between played tiles!");
		}
		
		if(!runsShoterThanSix){
			score = -1;
			message(player, "Run lengths must be shorter than " + numberOfTilesForHand, gameErrorColor);
			console.log(__line, "Run lengths must be shorter than " + numberOfTilesForHand);
		}
		
		if(!multipleOfFive){
			score = -1;
			message(player, "A run was not a multiple of " + numberOfTilesForHand, gameErrorColor);
			console.log(__line, "A run was not a multiple of " + numberOfTilesForHand);
		}
		
		if(!oneRunIsLongerThanOne && !skipped){
			score = -1;
			message(player, "At least one run must be longer than one tile!", gameErrorColor);
			console.log(__line, "At least one run must be longer than one tile!");
		}
		
		if(!allRunsLongerThanOneConnectToOldBoard){
			score = -1;
			message(player, "Tiles must connect to previous tiles!", gameErrorColor);
			console.log(__line, "Tiles must connect to previous tiles!");
		}
		
	} else {
		console.log(__line, "submitted is not possible!");
		score = -1;
	}
	//end turn stuff
	if(score >= 0){
		if(skipped){
			player.userData.skippedTurn = true;
		} else {
			player.userData.skippedTurn = false;
		}
		player.userData.score += score;
		//console.log(__line, "before remove", player.userData.tiles);
		for(var i = 0; i < corrected.changedTiles.length; i++){ //place tiles onto board
			player.userData.tiles.splice(player.userData.tiles.indexOf(corrected.changedTiles[i]), 1);
		}
		//console.log(__line, "after remove", player.userData.tiles);
		dealTiles(player, numberOfTilesForHand - player.userData.tiles.length);
		//console.log(__line, "after pick", player.userData.tiles);
		boardState = corrected.boardState;
		sendBoardState();
		nextTurn();
		updateTurnColor();
	} else {
		console.log("invalid play");
		//message(player, "Invalid play!", gameErrorColor);
	}
}

function ensureSubmittedIsPhysicallyPossible(player, submittedBoardState){
//submitted board is the same as the actual board /
//ensure all submitted tiles are actual tiles /
//only empty tiles replaced with played tiles /
//all played tiles are from players hand /
////all played tiles are in a line /
	var playedTilesCoord = [];
	var corrected = {error: false, boardState: [], changedTiles: []};
	if(boardIsCorrectSize(submittedBoardState)){ //submitted board is the same as the actual board
		for(var row = 0; row < boardState.length; row++){
			var correctedRow = [];
			for(var col = 0; col < boardState[row].length; col++){
				//ensure all submitted tiles are actual tiles
				if(submittedBoardState[row][col].id == blankTile.id){ //make a submitted board using server side tiles
					correctedRow.push(blankTile);
				} else if(submittedBoardState[row][col].id < allTiles.length){
					correctedRow.push(allTiles[submittedBoardState[row][col].id]);
				} else {
					correctedRow.push(blankTile);
					console.log(__line, "submitted non existant tile");
					message(player, "Submitted non existant tile!", gameErrorColor);
					corrected.error = true;
				}
				
				if(correctedRow[col].id != boardState[row][col].id ){ //if a tile has changed
					if(boardState[row][col].id == blankTile.id){ //if tile is empty on board state
						var tileIndex = player.userData.tiles.indexOf(correctedRow[col]);
						if(tileIndex >= 0){
							corrected.changedTiles.push(correctedRow[col]);
							playedTilesCoord.push({row: row, col: col});
						} else { //all played tiles are from players hand
							message(player, "Played tiles not in hand!", gameErrorColor);
							console.log(__line,"played tile not in hand!");
							corrected.error = true;
						}
					} else { //only empty tiles replaced with played tiles
						message(player, "Cannot replace old tile!", gameErrorColor);
						console.log(__line,"cannot replace already played tile!");
						corrected.error = true;
					}
				}
			}
			corrected.boardState.push(correctedRow);
		}
	} else {
		message(player, "Submitted board does not have the correct size!", gameErrorColor);
		console.log(__line, "Submitted board does not have the correct size!");
		corrected.error = true; 
	}
	//all played tiles are in a line
	var useRow = true;
	var useCol = true;
	if(playedTilesCoord.length > 0){
		iRow = playedTilesCoord[0].row;
		iCol = playedTilesCoord[0].col;
		for(var i = 1; i < playedTilesCoord.length; i++){
			if(playedTilesCoord[i].row != iRow){ useRow = false;}
			if(playedTilesCoord[i].col != iCol){ useCol = false;}
		}
	}
	if(!useRow && !useCol){
		message(player, "New tiles must be in a single row or column!", gameErrorColor);
		console.log(__line, "New tiles must be in a single row or column!");
		corrected.error = true;
	}
	//console.log(corrected.boardState);
	return corrected;
}

function boardIsCorrectSize(submittedBoardState){
	correctSize = true;
	//make sure row lengths match
	if(submittedBoardState.length != boardState.length){
		console.log(__line,"Invalid number of rows!"); 
		correctSize = false;
	} 
	for(var row = 0; row < boardState.length; row++){
		//make sure column lengths match
		if(submittedBoardState[row].length != boardState[row].length){
			console.log(__line,"Invalid number of columns!"); 
			correctSize = false;
		}
	}
	return correctSize;
}

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

function gameEnd() {
    console.log(__line,"gameEnd");
    updateBoard(io.sockets, notReadyTitleColor, false);

	message( io.sockets, "THE GAME HAS ENDED", gameColor);
	message(io.sockets, "Scores: ", gameColor);
	var i = 0;
	for( i = 0; i < players.length; i += 1){
		message(io.sockets, players[i].userData.userName + ": " + players[i].userData.score + "\n", gameColor);
	}
	
    players = [];
    console.log(__line,"before: ", players.length);
    allClients.forEach(function(client) {
        client.userData.ready = false;
        client.userData.statusColor = notReadyColor;
    });
    console.log(__line,"after: ", players.length);
    gameStatus = gameMode.LOBBY;
    updateUsers();
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