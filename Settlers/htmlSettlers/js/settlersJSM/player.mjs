import * as THREE from '../build/three.module.js';
import DaydreamController from '../vrMJS/daydream/DaydreamController.mjs'

let height = .1;
let geometry = new THREE.ConeGeometry(.1,height,3); 

class Player extends THREE.Group {
    constructor(){
        super()
        //create player shape
        this.material = new THREE.MeshPhongMaterial({color:0x0000aa});
        let m = new THREE.Mesh(geometry, this.material);
        //orient shape to point forward
        m.position.z = height/2;
        m.rotateX(-Math.PI/2);
        //add to this
        this.add(m)
        //this.add(new THREE.AxesHelper(.5));
        //this.userData.resource = resource;
        this.controllers = [];
    }

    updateFromPublicUserData(pubicUserData){
        this.material.color.setHex(pubicUserData.userColor);
    }

    addController(){
        let c = new DaydreamController();
        // move into position
        c.position.z = -0.3;
        this.controllers.push(c);
        this.add(c);
    }

    setPositionAndRotation(pos){
        //console.log(pos);
        this.position.x = pos.p.x;
        this.position.y = pos.p.y;
        this.position.z = pos.p.z;
        //debugger;
        this.setRotationFromEuler(new THREE.Euler(pos.r.x,pos.r.y,pos.r.z,'XYZ'));
        //assumes all children are controllers
        for(let i=0; i<pos.c.length;i++){
            if(this.controllers.length-1 < i){
                this.addController();
            }
            this.controllers[i].setPositionAndRotation(pos.c[i]);
        }
    }

    getPositionAndRotation(){
        //console.log(this.camera)
        let r = {
            p:{ //player position and rotation
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            r:{
                x: this.rotation.x,
                y: this.rotation.y,
                z: this.rotation.z
            },
            c: this.controllers.map(c=>{
                return{
                p:{ //all children position and rotation relative to player
                    x: c.position.x,
                    y: c.position.y,
                    z: c.position.z
                },
                r:{
                    x: c.rotation.x,
                    y: c.rotation.y,
                    z: c.rotation.z
                }}
            })
        }

        
        //this.socket.emit('playerPosition',thisPlayerPos);
        //this.myObj.obj.setPositionAndRotation(thisPlayerPos);
        return r;
    }
}

export default Player;