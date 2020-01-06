//import io from 'socket.io-client';
//import io from 'socket.io/node_modules/socket.io-client';

//import * as io from '../../socket.io/socket.io.js';

//socket connection info
let publicAddress = 'http://alanisboard.ddns.net/';
let internalAddress = 'http://localhost:8080/';

let socket = io(publicAddress); //try public address //"24.42.206.240" for alabama

//attempt to connect to global server. If fail, fall back on loacl address
var trylocal = 0;
socket.on('connect_error',function(error){
	console.log("I got an error!", error);
	console.log("socket to:", socket.disconnect().io.uri, "has been closed.");
	if(!trylocal){ //prevent loops
		if(window.location.href != internalAddress){
			window.location.replace(internalAddress);
		}
		socket.io.uri = internalAddress;
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
	/*console.log("Connection successful!");
	if(localStorage.userName === undefined){
		changeName(socket.id);
	} else {
		socket.emit('userName', localStorage.userName);
	}
	
	if(localStorage.id !== undefined){
		socket.emit('oldId', localStorage.id);
	}
	localStorage.id = socket.id;*/
});

socket.on('allPlayers', function(playersObj){
    for(let i=0; i < playersObj.number; i++){
        if(socket.game.Players[i] == undefined){
            socket.game.newPlayer();
        }

        //identify which is this players object
        if(i == playersObj.id){
            socket.game.myObj = {obj: socket.game.Players[i], id: i};
        }
    }
});

socket.on('newPlayer', function(pos){
	socket.game.newPlayer();
});

socket.on('playerPosition', function(pos){
    let p = socket.game.Players[pos.id];
    p.setPositionAndRotation(pos)
});

//console.log("hello")

export default socket