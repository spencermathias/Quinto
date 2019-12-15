//game logistics still add in user data

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
var yourTurnColor = "#0000ff";


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

function checkElegibility(p) {
}

class submitButton{
	constructor(x,y,width,hight){
		var x = this.x;
		var y = this.y;
		var width = this.width;
		var hight = this.hight;
	}
}

function dealTiles(target = io.sockets){
	for (var x = 0; x < 7; x++){
		players.forEach(
			y = shared.cardDes.deck.indexOf(Math.floor(Math.random * deck.length));
			userData.tiles.push([y]);
		)
	}
	socket.emit('showTiles',userData.tiles)
}

function gameStart(){
	dealTiles();
	
}
//end game logistics