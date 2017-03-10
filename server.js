
var express = require('express');
var http = require('http');
var io = require('socket.io');
const spawn = require('child_process').spawn;
 
var app = express();
app.use(express.static('./webpage')); //working directory
//Specifying the public folder of the server to make the html accesible using the static middleware

var server=http.createServer(app).listen(8080); //Server listens on the port 8124
io = io.listen(server); 
/*initializing the websockets communication , server instance has to be sent as the argument */

var allClients = [];
var players = [];
var minPlayers = 2;
var maxPlayers = 10; //must increase card number for more players
var numberOfRounds = 10;

var cardDesc = {
	colors: ['#ff0000', 	'#00ff00', '#0000ff', 	'#ffff00', '#FF8C00', '#ff00ff'],
					//red		green		blue		yellow		orange	   purple
	numPerSuit: 16,
	outs: 4,
	changes: 4,
	wilds: 2,
	minus: 2,
	plus: 2
}

var gameMode = {
	LOBBY: 1,
	PLAY: 2,
	END: 3	
}
var gameStatus = gameMode.LOBBY;

var serverColor = '#ffff00';
var chatColor = '#ffffff';
var readyColor = '#ffffff';
var notReadyColor = '#ff0000';
var readyTitleColor = '#00ff00';
var notReadyTitleColor = '#ff0000';
var spectatorColor = '#444444';
var notYourTurnColor = '#ffffff';
var yourTurnColor = '#0000ff';

io.sockets.on("connection",function(socket){
    /*Associating the callback function to be executed when client visits the page and 
      websocket connection is made */
	socket.userData = {};
	socket.userData.userName = 'unknown';
	allClients.push(socket);
	if( gameStatus == gameMode.LOBBY ){
		socket.userData.statusColor = notReadyColor;
	} else {
		socket.userData.statusColor = spectatorColor;
		updateBoard(socket, notReadyTitleColor, true);
	}
	 
    var message_to_client = {
		data:"Connection established!",
		color: serverColor
    }
    socket.emit('message',JSON.stringify(message_to_client)); 
	/*var broadcast_message = {
		data:"Another client has connected",
		color: serverColor
	}
	socket.broadcast.emit('message',JSON.stringify(broadcast_message));
	*/
    /*sending data to the client , this triggers a message event at the client side */
    console.log('Socket.io Connection with client ' + socket.id +' established');
	
	
	socket.on('disconnect',function( sock ) {
		var message = {
			data: '' + socket.userData.userName + ' has left.',
			color: serverColor
		}
		io.sockets.emit('message', message);
		console.log('disconnected: ' + socket.id);
		var i = allClients.indexOf(socket);
		allClients.splice(i, 1);
		updateUsers();
	});
	
    socket.on("message",function(data){
        /*This event is triggered at the server side when client sends the data using socket.send() method */
        data = JSON.parse(data);
 
        console.log(data);
        /*Printing the data */


		var ack_to_client = {
			data: 'You: ' + data.message,
			color: chatColor
		}
		var broadcast_message = {
			data: '' + socket.userData.userName + ': ' + data.message,
			color: chatColor
		}
		socket.emit('message', JSON.stringify(ack_to_client));
		socket.broadcast.emit('message', JSON.stringify(broadcast_message));
		
		if( data.message == 'end' ){
			console.log('forced end');
			gameEnd();
		} else if( data.message == 'start' ){
			console.log('forced start');
			gameStart();
		}
        /*Sending the Acknowledgement back to the client , this will trigger "message" event on the clients side*/
    });
	
	/*socket.on('command', function(command){
		if(data.message == "data"){
			console.log("ls command recieved ");
			const ls = spawn('ls');
			ls.stdout.on('data', (data)=> {
				var ack_to_client = {
					data:"Server Received the message: " + data
				}
				socket.emit('message', JSON.stringify(ack_to_client));
				console.log(data);
			});
			ls.stderr.on('data', (data) => {
			  console.log(`stderr: ${data}`);
			});

			ls.on('close', (code) => {
			  console.log(`child process exited with code ${code}`);
			});
		} else if(data.message == 'prox'){
			console.log('proximity sensor command recieved! ');
			var a =0;
			while (a < 100){
				const prox = spawn('./scripts/distanceSensor.py');
				prox.stdout.on('data', (data) => {
					var ack_to_client = {
						data:'Distance is:  ' + data + 'cm'
					}
					socket.emit('message', JSON.stringify(ack_to_client));
					console.log(""+data);
				});
				prox.stderr.on('data', (data) => {
				  console.log(`stderr: ${data}`);
				});

				prox.on('close', (code) => {
				  console.log(`child process exited with code ${code}`);
				});
				a += 1;
			}
		}
	}); */
	
	socket.on('newUser', function(userName){
		socket.userData.userName = userName;
		socket.userData.ready = false;
		console.log('added new user: ' + socket.userData.userName);
		var broadcast_message = {
			data: '' + socket.userData.userName + ' has joined!',
			color: serverColor
		}
		io.sockets.emit('message',JSON.stringify(broadcast_message));
		updateUsers();
	});
	
	socket.on('ready', function(ready){
		if( gameStatus == gameMode.LOBBY){
			socket.userData.ready = ready.ready;
			if( socket.userData.ready == true){
				players.push( socket );
				socket.userData.statusColor = readyColor;
				updateBoard(socket,readyTitleColor , false);
			} else {
				var i = players.indexOf(socket);
				players.splice(i, 1);
				socket.userData.statusColor = notReadyColor;
				updateBoard(socket,notReadyTitleColor , false);
			}
			checkStart();
			updateUsers();
		}
	});
});

function updateUsers(){
	console.log('--------------Sending New User List--------------');
	var userList = [];
	for( i in allClients){
		console.log('userName: ' + allClients[i].userData.userName, '   |   ready: ' + allClients[i].userData.ready);
		userList.push({
			userName: allClients[i].userData.userName,
			color: allClients[i].userData.statusColor
			});
	}
	io.sockets.emit('userList', userList);
	console.log('----------------Done Sending List----------------');
}

function updateBoard(socketSend, titleColor, showBoard){
	var showBoard = {
		titleColor: titleColor,
		displayTitle: (showBoard == true) ? 'none' : 'flex',
		displayGame: (showBoard == true) ? 'flex' : 'none'
	}
	socketSend.emit('showBoard', showBoard);
}

function checkStart(){
	console.log( 'playerCount: ' + players.length);
	console.log('gameStatus: ' + gameStatus);
	if( players.length >= minPlayers && gameStatus == gameMode.LOBBY){
		var startGame = 1;
		for ( i in allClients ){
			if( allClients[i].userData.ready == false){
				startGame = 0;
			}
		}
		if(startGame == 1){
			gameStart();
		}
	}
}

function gameStart(){
	console.log('gameStart');
	var message = {
		data: 'THE GAME HAS STARTED',
		color: serverColor
	}
	io.sockets.emit('message', JSON.stringify(message));
	gameStatus = gameMode.PLAY;
	//reset colors
	for( i in allClients){
		if ( allClients[i].userData.ready == true ){
			allClients[i].userData.statusColor = notYourTurnColor;
		} else {
			allClients[i].userData.statusColor = spectatorColor;
		}
	}
	updateBoard(io.sockets, readyTitleColor, true);
	updateUsers();
	gamePlay();
}

function gamePlay(){
	console.log('gamePlay');
	for ( var round = numberOfRounds; round > 0; round--){
		console.log( 'round: ' + round);
		var deck = makeDeck();
		var deck = dealCards(deck, round);
		
		console.log('deck length: ', deck.length);
		var trumpCard = chooseRandomCard(deck);
		console.log('trump is: ' , trumpCard);
		console.log('deck length: ', deck.length);
		
		for( i in players){
			console.log('cards delt for: '+players[i].userData.userName+' : ', players[i].userData.cards);
		}
		console.log('number left in stack: ' + deck.length);
		//chooseTrump();

		//console.log('got bids from every player')
		//waitForBids();
		for( var handNum = 0; handNum < round; handNum++){
			//console.log( 'hand: ' + handNum);
			hand = [];
			for( i in players ){
				hand.push('card');
				//hand.push(playCard(players[(round + i) % players.length]));
				//updateOthers(hand);
			}
			//console.log('winner gets: ', hand);
			//giveHandToWinner(hand);
		}
		//console.log('tally points and clear hand for all players')
		for( i in players){
			//tallyPoints(players[i]);
			//clearCards(players[i]);
		}
	}
	console.log('declare winner');
	//declareWinner();
}

function gameEnd(){
	console.log('gameEnd')
	updateBoard(io.sockets, notReadyTitleColor, false);
	
	var message = {
		data: "THE GAME HAS ENDED",
		color: serverColor
	}
	io.sockets.emit('message', JSON.stringify(message));
	players = [];
	console.log('before: ', players.length);
	for ( i in allClients ){
		allClients[i].userData.ready = false;
		allClients[i].userData.statusColor = notReadyColor;
	}
	console.log('after: ', players.length);
	gameStatus = gameMode.LOBBY;
	updateUsers();
}

function makeDeck(){
	var cards = []
	for( var i = 0; i < cardDesc.colors.length; i++){
		for (var j = 0; j < cardDesc.numPerSuit; j++){
			cards.push({type: 'number', value: { color: cardDesc.colors[i], number: j}});
		}
	}
	for( var i = 0; i < cardDesc.outs; i++){
		cards.push({type: 'word', value: {type: 'out'}})
	}
	for( var i = 0; i < cardDesc.changes; i++){
		cards.push({type: 'word', value: {type: 'change'}})
	}
	for( var i = 0; i < cardDesc.wilds; i++){
		cards.push({type: 'word', value: {type: 'wild'}})
	}
	for( var i = 0; i < cardDesc.plus; i++){
		cards.push({type: 'word', value: {type: 'plus'}})
	}
	for( var i = 0; i < cardDesc.minus; i++){
		cards.push({type: 'word', value: {type: 'minus'}})
	}
	//console.log('card length:', cards.length);
	return cards;
}

function dealCards(cards, amountToBeDelt){
	for( player in players){
		players[player].userData.cards = [];
		for( var i = 0; i < amountToBeDelt; i++){
			players[player].userData.cards.push(chooseRandomCard(cards));
		}
	}
	return cards;
}

function chooseRandomCard(cards){
	var index = Math.floor(Math.random() * cards.length);
	if( index >= cards.length) { index =  cards.length - 1; }
	returnCard = cards[index];
	cards.splice(index, 1);
	return returnCard;
}