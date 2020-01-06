import Board from './settlersJSM/board.mjs';
import Player from './settlersJSM/player.mjs';

class Game{
    constructor(){
        this.board = new Board();
        this.Players=[];

        this.socket = undefined;
        this.scene = undefined;
        this.controls = undefined;

        //this persons 3d object
        this.myObj = undefined; // {obj: socket.game.Players[i], id: i};
        setInterval(this.sendPos.bind(this),100);
        console.log(this);
    }

    init(socket, scene, camera){
        this.socket = socket;
        this.scene = scene;
        scene.add(this.board);

        this.camera = camera;
    }

    newPlayer(){
        let p = new Player(0x0000aa);
        this.Players.push(p);
        this.scene.add(p)
    }
    
    sendPos(){
        //console.log(this.camera)
        if(this.socket && this.camera && this.myObj){
            this.socket.emit('playerPosition',{
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z,
                rx: this.camera.rotation.x,
                ry: this.camera.rotation.y,
                rz: this.camera.rotation.z,
                id: this.myObj.id
            });
        }
    }

}

export default Game;