var express = require("express");
var http = require("http");
var io = require("socket.io");
//const spawn = require("child_process").spawn;

var app = express();
app.use(express.static("./webpage")); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var socket = 8080;
//var server = http.createServer(app).listen(8080); //Server listens on the port 8124
var server = http.createServer(app).listen(socket,"0.0.0.0",511,function(){console.log(__line,"Server connected to socket: "+socket);});//Server listens on the port 8124
io = io.listen(server);
/*initializing the websockets communication , server instance has to be sent as the argument */

var minPlayers = 2;
var maxPlayers = 9; //must increase card number for more players
var numberOfRounds = 10;

var allClients = [];
var players = [];
var currentRound = numberOfRounds;
var currentTurn = 0;
var firstPlayer;
var nextToLeadHand;
var nextToLeadRound;

var cardDesc = {
    colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#FF8C00", "#ff00ff"],
              //red       green       blue     yellow      orange     purple
    numPerSuit: 16,
    wordCardColor: "#000000",
    wordCardIdentifyer: -1,
    noneColor: "#ffffff",
    noneCardIdentifyer: -2,
    outs: 4,
    changes: 4,
    wilds: 0,
    minus: 2,
    plus: 2
};

var gameMode = {
    LOBBY: 1,
    BID: 2,
    HAND: 3,
    PLAY: 4,
    END: 5
};

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

var noneCard = {type: "none", owner: "none", color: cardDesc.noneColor, number: cardDesc.noneCardIdentifyer, id: 0};
var ledCard = noneCard;

var deck = [];
var trumpCard = noneCard;

var pointsPerHand = 1;
var plusBonus = 5;
var minusPenalty = -5;
var missedBidPenalty = -5;
var gotBidBonus = 10;

console.log("Server Started!");

io.sockets.on("connection", function(socket) {
    /*Associating the callback function to be executed when client visits the page and
      websocket connection is made */
    socket.userData = {
		userName: "Unknown",
		cards: [],
		cardSelected: noneCard,
		bid: -1,
		handsWon: [],
		score: 0,
		handScore: 0
	};

    allClients.push(socket);
    if (gameStatus === gameMode.LOBBY) {
        socket.userData.statusColor = notReadyColor;
    } else {
        socket.userData.statusColor = spectatorColor;
        updateBoard(socket, notReadyTitleColor, true);
    }

    var message_to_client = {
        data:"Connection established!",
        color: serverColor
    };
    socket.emit("message",JSON.stringify(message_to_client));
    socket.emit("trumpCard", trumpCard);

    /*sending data to the client , this triggers a message event at the client side */
    console.log(__line, "Socket.io Connection with client " + socket.id +" established");

    socket.on("disconnect",function() {
		message( io.sockets, "" + socket.userData.userName + " has left.", serverColor);
        console.log(__line,"disconnected: " + socket.userData.userName + ": " + socket.id);
        var i = allClients.indexOf(socket);
        allClients.splice(i, 1);
        i = players.indexOf(socket);
        players.splice(i, 1);
		if( players.length < 2) {
			gameEnd();
		} else {
			checkForAllBids();
			checkForAllCards();
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

    /*socket.on("command", function(command) {
        if(data.message == "data"){
            console.log("ls command recieved ");
            const ls = spawn("ls");
            ls.stdout.on("data", (data)=> {
                var ack_to_client = {
                    data:"Server Received the message: " + data
                }
                socket.emit("message", JSON.stringify(ack_to_client));
                console.log(data);
            });
            ls.stderr.on("data", (data) => {
              console.log(`stderr: ${data}`);
            });

            ls.on("close", (code) => {
              console.log(`child process exited with code ${code}`);
            });
        } else if(data.message == "prox") {
            console.log("proximity sensor command recieved! ");
            var a =0;
            while (a < 100){
                const prox = spawn("./scripts/distanceSensor.py");
                prox.stdout.on("data", (data) => {
                    var ack_to_client = {
                        data:"Distance is:  " + data + "cm"
                    }
                    socket.emit("message", JSON.stringify(ack_to_client));
                    console.log(""+data);
                });
                prox.stderr.on("data", (data) => {
                  console.log(`stderr: ${data}`);
                });

                prox.on("close", (code) => {
                  console.log(`child process exited with code ${code}`);
                });
                a += 1;
            }
        }
    }); */

    socket.on("newUser", function(userName) {
        socket.userData.userName = userName;
        socket.userData.ready = false;
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

    socket.on("recieveBid", function(bidAmount) {
        if( gameStatus === gameMode.BID ) {
            socket.userData.bid = bidAmount;
            console.log(__line,socket.userData.userName + " bid: " + socket.userData.bid);
            socket.userData.statusColor = readyColor;
            checkForAllBids();
            updateUsers();
        }
    });

    socket.on("cardSelected", function(cardSubmitted) {
        if( gameStatus === gameMode.HAND) {
            if( players[currentTurn%players.length].id === socket.id ) {
				//get player cards
				var playerCards = players[currentTurn%players.length].userData.cards;
				//is the submitted card in players hand?
				var card = noneCard;
				var i;
				for( i = 0; i < playerCards.length; i += 1){
					if( playerCards[i].id === cardSubmitted.id ){
						card = playerCards[i]; //find matching card
					} 
				}
				console.log(__line, 'cardSubmitted', cardSubmitted.id, 'card found id', card.id);
				
				if (card.type !== noneCard.type) {
					if(validCardToPlay(socket, card)) {
						socket.userData.cardSelected = card;
						socket.userData.cards.splice(playerCards.indexOf(card), 1);
						socket.emit("cards", socket.userData.cards); //update player cards
						
						//console.log(__line,'input card', cardSubmitted), 
						console.log(__line,socket.userData.userName + ' selected ', card);
						
						switch(card.type) {
							case "number":
								if(ledCard.type === noneCard.type) {
									ledCard = card;
								}
								break;
							case "wild":
								if(ledCard.type === noneCard.type) {
									ledCard = card;
								}
								socket.emit("getWildColorNumber");
								break;
							case "out":
								cardReturnToDeck(trumpCard, deck);
								trumpCard = noneCard;
								sendTrumpToPlayers(trumpCard);
								console.log(__line," no trump card");
								break;
							case "change":
								chooseTrumpCard(deck);
								sendTrumpToPlayers(trumpCard);
								console.log(__line,"trump card changed");
								break;
						}
						currentTurn = (currentTurn + 1) % players.length;
						console.log(__line,"" + socket.userData.userName + " has submitted card: " + socket.userData.cardSelected);
						console.log(__line, 'next turn');
						updateTurnColor(); //also updates users
					} else {
						socket.userData.cardSelected = noneCard;
						console.log(__line,'card not what is led (if there is something led)');
						message( socket, 'You must play the color that is led', gameErrorColor);
					}
				} else {
					console.log(__line,'card not in hand');
					message(socket, 'You do not own that card!', gameErrorColor);
				}
			} else {
				console.log(__line,'outofTurn');
				message( socket, 'It is not your turn!', gameErrorColor);
            }
			checkForAllCards();
        } else {
			console.log(__line,'notAcceptingCards');
            message( socket, 'Wrong mode to accept cards!', gameErrorColor);
        }
    });
});

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
        console.log(__line,"userName:", client.userData.userName, " |ready:", client.userData.ready, "| bid:", client.userData.bid, "|status:", client.userData.statusColor);
        console.log(__line,"cardtype:", client.userData.cardSelected.type, "|score:", client.userData.score + client.userData.handScore);
		userList.push({
            id: client.id,
            userName: client.userData.userName,
            numberOfCards: client.userData.cards.length,
            color: client.userData.statusColor,
            cardSelected: client.userData.cardSelected,
            bid: client.userData.bid,
            handsWon: client.userData.handsWon.length,
            cardsLeft: client.userData.cards.length,
			score: client.userData.score + client.userData.handScore
        });
    });
    io.sockets.emit("userList", userList);
    console.log(__line,"----------------Done Sending List----------------");
}

function updateBoard(socketSend, titleColor, showBoard) {
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
        var startGame = 1;
        allClients.forEach(function(client) {
            if( client.userData.ready === false) {
                startGame = 0;
            }
        });
        if(startGame === 1) {
            gameStart();
        }
    }
}

function gameStart() {
	currentRound = numberOfRounds;
	currentTurn = 0;
	if(players.length > 0){
		console.log(__line,"gameStart");
		message(io.sockets, "THE GAME HAS STARTED", gameColor);
		gameStatus = gameMode.PLAY;
		//reset colors
		allClients.forEach(function(client) {
			if ( client.userData.ready === true ) {
				client.userData.statusColor = notYourTurnColor;
				client.userData.cards = [];
				client.userData.cardSelected = noneCard;
				client.userData.bid = -1;
				client.userData.handsWon = [];
				client.userData.score = 0;
				client.userData.handScore = 0;
			} else {
				client.userData.statusColor = spectatorColor;
			}
		});
		updateBoard(io.sockets, readyTitleColor, true);
		updateUsers();
		nextToLeadRound = Math.floor(Math.random()*players.length); //random starting person
		startRound();
	}
}

function startRound() {
	players.forEach(function(player){ //reset player for round
		player.userData.cards = [];
		player.userData.handsWon = [];
		player.userData.handScore = 0;
		player.userData.bid = -1;
		player.userData.cardSelected = noneCard;
	});
	
    console.log(__line, "round: " + currentRound);
	nextToLeadHand = currentTurn = nextToLeadRound%players.length;
	nextToLeadRound += 1; //next person in order starts round
	console.log(__line,players[currentTurn%players.length].userData.userName + " leads this round!");
	message(io.sockets, players[currentTurn%players.length].userData.userName + " leads this round!", gameColor);
	
    //console.log(__line,"deck length: ", deck.length);4
    deck = makeDeck();
    dealCards(deck, currentRound);
    chooseTrumpCard(deck);
    console.log(__line,"trump is: " , trumpCard);
    //console.log(__line, "deck length: ", deck.length);

    sendCards();
    updateUsers();

    console.log(__line," wait for bids ");
    getBids();
}

function makeDeck() {
    var cards = [];
	var i;
	var j;
	var cardId = 1; //noneCard is id 0
    for (i = 0; i < cardDesc.colors.length; i+=1) {
        for (j = 0; j < cardDesc.numPerSuit; j+=1) {
            cards.push({type: "number", owner: "deck", color: cardDesc.colors[i], number: j, id: cardId++});
        }
    }
    for (i = 0; i < cardDesc.outs; i+=1) {
        cards.push({type: "out", owner: "deck", color: cardDesc.wordCardColor, number: cardDesc.wordCardIdentifyer, id: cardId++});
    }
    for (i = 0; i < cardDesc.changes; i+=1) {
        cards.push({type: "change", owner: "deck", color: cardDesc.wordCardColor, number: cardDesc.wordCardIdentifyer, id: cardId++});
    }
    for (i = 0; i < cardDesc.wilds; i+=1) {
        cards.push({type: "wild", owner: "deck", color: cardDesc.wordCardColor, number: cardDesc.wordCardIdentifyer, id: cardId++});
    }
    for (i = 0; i < cardDesc.plus; i+=1) {
        cards.push({type: "plus", owner: "deck", color: cardDesc.wordCardColor, number: cardDesc.wordCardIdentifyer, id: cardId++});
    }
    for (i = 0; i < cardDesc.minus; i+=1) {
        cards.push({type: "minus", owner: "deck", color: cardDesc.wordCardColor, number: cardDesc.wordCardIdentifyer, id: cardId++});
    }
    //console.log(__line, "card length:", cards.length);
    return cards;
}

function dealCards(cards, amountToBeDelt) {
    players.forEach(function(player) {
        player.userData.cards = [];
		var cardToGive;
		var i;
        for( i = 0; i < amountToBeDelt; i+=1) {
            cardToGive = chooseRandomCard(cards);
            cardToGive.owner = player.id;
            player.userData.cards.push(cardToGive);
        }
    });
}

function chooseRandomCard(cards) {
    var index = Math.floor(Math.random() * cards.length);
    //if( index >= cards.length) { index =  cards.length - 1; }
    var returnCard = cards[index];
    cards.splice(index, 1);
    return returnCard;
}

function cardReturnToDeck(card, cards) {
    cards.push(card);
}

function chooseTrumpCard(cards) {
    trumpCard = chooseRandomCard(cards);
    var attempt = 0;
	var index;
    while( trumpCard.type !== "number") {
		if( trumpCard.type !== noneCard.type ){
			cardReturnToDeck(trumpCard, cards);
			console.log(__line, "trump returned to deck");
		}
        trumpCard = chooseRandomCard(cards);
        attempt += 1;
        if ( attempt > 1000 ) { //give up if no number cards
            cardReturnToDeck(trumpCard, cards);
            index = Math.floor(Math.random() * (cardDesc.colors.length));
            trumpCard = {type: "number", owner: "deck", color: cardDesc.colors[index], number: cardDesc.numPerSuit, id: -1};
        }
    }
    sendTrumpToPlayers(trumpCard);
}

function sendTrumpToPlayers(trump) {
	io.sockets.emit("trumpCard", trump);
}

function sendCards() {
    players.forEach(function(player) {
        player.emit("cards", player.userData.cards);
    });
}

function getBids() {
    gameStatus = gameMode.BID;
    players.forEach(function(player) {
        player.userData.bid = -1; //reset bids
        player.emit("requestBid");
        player.userData.statusColor = notReadyColor;
    });
	console.log(__line, "get Bids");
    updateUsers();
}

function checkForAllBids() {
	if (gameStatus === gameMode.BID){
		var allBidsIn = true;
		players.forEach(function(player) {
			if (player.userData.bid < 0){
				allBidsIn = false;
			}
		});
		if (allBidsIn) {
			console.log(__line,"All Bids In");
			io.sockets.emit("allBidsIn");
			players.forEach(function(player) {
				console.log(__line,"Bid for: " + player.userData.userName + ": " + player.userData.bid);
			});
			gameStatus = gameMode.PLAY;
			tallyScoreFromHand(); //show initial score
			getHand();
		}
	}
}

function getHand() {
    gameStatus = gameMode.HAND;
    //check if trump is out
    if (trumpCard.type === noneCard.type ) {
        chooseTrumpCard(deck);
    }
    ledCard = noneCard;
    players.forEach(function(player) {
        player.userData.cardSelected = noneCard; //reset selected
    });
	console.log(__line,'turn: ', currentTurn%players.length, 'player:', players[currentTurn%players.length].userData.userName);
    players[currentTurn%players.length].emit("requestCard");
	updateTurnColor();
}

function updateTurnColor(){
	players.forEach(function(player){
		player.userData.statusColor = notYourTurnColor;
	});
	players[currentTurn%players.length].userData.statusColor = yourTurnColor;
	console.log(__line,'update turn color');
	updateUsers();
}

function validCardToPlay(player, card) {
	//console.log(__line,'card: ',card);
	//console.log(__line,'led: ', ledCard);
    if (ledCard.type === noneCard.type || card.color === ledCard.color) {
        console.log(__line,'card is whats led = valid');
		return true;
    } else {
        var doesNotHaveColor = true;
        player.userData.cards.forEach(function(pcard) {
			//console.log(__line,'playerCard', pcard)
			
            if (pcard.color === ledCard.color ) {
                doesNotHaveColor = false;
				//player.emit('mustPlayWhatIsLed');
				console.log(__line, 'player has what is led and must play it = invalid');
            }
        });
        return doesNotHaveColor;
    }
}

function checkForAllCards() {
	if (gameStatus === gameMode.HAND){
		var allIn = true;
		players.forEach(function(player) {
			console.log(__line,'user: ' + player.userData.userName + 
				' selected card type: '+ player.userData.cardSelected.type +
				', number: ' + player.userData.cardSelected.number +
				', color: ' + player.userData.cardSelected.color);
			if (player.userData.cardSelected.type == noneCard.type ) {
				allIn = false;
			}
		});
		
		if(allIn) {
			//console.log(__line, "delay start");
			allIn = false; //prevents triggering during delay
			gameStatus = gameMode.PLAY;
			setTimeout(function(){
				//console.log(__line, "delay end.");
				io.sockets.emit("allCardsIn");
				console.log(__line,'all cards in');
				whoWinsHand();
			}, 2000);
		}
	}
}

function whoWinsHand() {
	var handWinner = undefined;
    var hand = [];
    var number = -1;
    var trumpPlayers = [];
    var ledPlayers = [];

    players.forEach(function(player) {
        hand.push(player.userData.cardSelected); //collect hand
        if(trumpCard != noneCard && player.userData.cardSelected.color === trumpCard.color) { //sort who played trump
            trumpPlayers.push(player);
        } else if (ledCard != noneCard && player.userData.cardSelected.color === ledCard.color) { //sort who played what was led
            ledPlayers.push(player);
        }
    });
	
	var i;
	if(trumpPlayers.length > 0){ //if there are any trump players
		for (i = 0; i < trumpPlayers.length; i += 1){
			if( trumpPlayers[i].userData.cardSelected.number > number ) {
				handWinner = trumpPlayers[i];
				number = trumpPlayers[i].userData.cardSelected.number;
			}
		}
		console.log(__line,'trump player wins');
		console.log(__line,handWinner.userData.userName + " gets the hand!");
		handWinner.userData.handsWon.push(hand); //add hand to winner
		
	} else if (ledPlayers.length > 0){ //else if there are any players who played what was led
		for (i = 0; i < ledPlayers.length; i += 1){
			if (ledPlayers[i].userData.cardSelected.number > number ) {
				number = ledPlayers[i].userData.cardSelected.number;
				handWinner = ledPlayers[i];
			}
		}
		console.log(__line,'led card player wins');
		console.log(__line,handWinner.userData.userName + " gets the hand!");
		handWinner.userData.handsWon.push(hand); //add hand to winner
		
	} else { //else there must be all word cards
		console.log(__line,'no one wins the hand');
		handWinner = undefined;
	}
    
	if(handWinner != undefined){
		console.log(__line,'This person started the previous round', nextToLeadHand, players[nextToLeadHand].userData.userName);
		
		nextToLeadHand = players.indexOf(handWinner); //person who won round
		currentTurn = nextToLeadHand%players.length; //goes first for next round
		
		console.log(__line,'someone won');
		console.log(__line,'This person won round: ',nextToLeadHand, players[nextToLeadHand].userData.userName);
		console.log(__line,'This person starts next round: ',currentTurn, players[currentTurn].userData.userName);
		
		message(io.sockets, handWinner.userData.userName + " gets the hand!", gameColor);
	} else {
		currentTurn = nextToLeadHand%players.length;
		
		console.log(__line, 'This person started the previous round', nextToLeadHand, players[nextToLeadHand].userData.userName);
		console.log(__line,'No one won');
		console.log(__line,'This person goes next: ',currentTurn, players[currentTurn].userData.userName);
		message(io.sockets, "No one gets the hand!", gameColor);
	}
	
	players.forEach(function(player){
		player.userData.cardSelected = noneCard; //reset selected
	});
	
	updateTurnColor(); //updates user
	
    if (playersHaveCards()) { //do players still have cards left?
        tallyScoreFromHand();
		if(trumpCard.type === noneCard.type){
			console.log(__line, "No trump at end of trick. Picking a new Trump");
			chooseTrumpCard(deck); //choose new trump if no trump at end of hand
		}
		getHand(); //start next hand
    } else {
		addHandScoreToTotal();
        finishRound(); //finish round
    }
}

function playersHaveCards(){
	var i;
	var cards = false;
	for(i=0; i<players.length; i += 1){
		if(players[i].userData.cards.length > 0){
			cards = true;
		}
	}
	return cards;
}

function tallyScoreFromHand(){
	var score;
	players.forEach(function(player){
		score = 0;
		player.userData.handsWon.forEach(function(hand){
			score += pointsPerHand;
			hand.forEach(function(card){
				if (card.type === 'plus' ){ score += plusBonus; }
				if (card.type === 'minus'){ score += minusPenalty;}
			});
		});
		if( player.userData.handsWon.length != player.userData.bid){
			score += missedBidPenalty;
		} else {
			score += gotBidBonus;
		}
		player.userData.handScore = score;
	});
}

function addHandScoreToTotal(){
	tallyScoreFromHand(); //update hand scores
	players.forEach(function(player){
		player.userData.score += player.userData.handScore;
		player.userData.handScore = 0;
	});
}

function finishRound() {
    currentRound -= 1;
    if( currentRound > 0) {
        startRound();
    } else {
        gameEnd();
    }
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

//TODO: 
// wilds
// stop held enter from spamming chat
// check and make sure turn order doesnt break when people leave
// end score screen

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
  });