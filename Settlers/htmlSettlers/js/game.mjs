import Board from './settlersJSM/board.mjs';
import Player from './settlersJSM/player.mjs';

class Game{
    constructor(){
        this.board = new Board();
        this.PlayersById={};

        this.socket = undefined;
        this.scene = undefined;
        this.controls = undefined;
        this.camera = undefined;

        //this persons 3d object
        //socket.game.Players[i]
        this.myObj = new Player();

        console.log(this);
    }

    init(socket, scene, camera){
        this.socket = socket;
        this.scene = scene;
        scene.add(this.board);

        this.camera = camera;
        
        scene.add(this.myObj);
    }

    updatePlayers(allPlayerDataById){
        //console.log(allPlayerDataById);
        let updated = {}; //updated tracker
        for(const p in this.PlayersById){
            updated[p] = false;
        }

        //debugger;

        for(const p in allPlayerDataById){
            if(this.PlayersById[p] == undefined){
                let pObj = new Player();
                this.PlayersById[p] = pObj;
                this.scene.add(pObj)
            }
            
            this.PlayersById[p].updateFromPublicUserData(allPlayerDataById[p]);
            updated[p] = true
        }

        for(const p in this.PlayersById){
            if(updated[p] == false){
                this.scene.remove(this.PlayersById[p]); //remove from scene
            }
        }
    }

    //for adding other players
    newPlayer(){
        this.scene.add(p);
    }
    
}

export default Game;