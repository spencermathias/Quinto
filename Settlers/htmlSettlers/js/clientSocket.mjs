//import io from 'socket.io-client';
//import io from 'socket.io/node_modules/socket.io-client';

//import * as io from '../../socket.io/socket.io.js';

//socket connection info
let publicAddress = 'https://alanisboard.ddns.net/';
//let publicAddress = '144.39.227.91:8080';
let internalAddress = 'https://localhost/';

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

	//start periodically sending position data
	setInterval(periodicData,100);
});

function periodicData(){
	//get data
	let pos = socket.game.myObj.getPositionAndRotation();
	//send to server; the server adds the appropriate id to the message
	socket.emit('playerPosition',pos);
}


//read only
let allPlayersById = {};

socket.on('allPublicUserData', function(userList){
	//console.log(userList);
    for(let i=0; i < userList.length; i++){
		let p = userList[i];
		//update dictionary of players
		allPlayersById[p.id] = p;
		socket.game.updatePlayers(allPlayersById);
    }
});

socket.on('playerPosition', function(pos){
	if(socket.game.PlayersById[pos.id] != undefined){
		socket.game.PlayersById[pos.id].setPositionAndRotation(pos);
	}
});

//console.log("hello")

export default socket