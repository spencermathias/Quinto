import * as THREE from '../build/three.module.js';
import PlaneText from '../settlersJSM/text.mjs';

const sinr = Math.sin(Math.PI/3);
const cosr = Math.cos(Math.PI/3);

class hexGeometry extends THREE.ExtrudeBufferGeometry{
    constructor(radius, depth){
        let shape = new THREE.Shape();
        shape.moveTo(0,radius);
        shape.lineTo(radius*sinr, radius*cosr);
        shape.lineTo(radius*sinr, -radius*cosr);
        shape.lineTo(0,-radius);
        shape.lineTo(-radius*sinr, -radius*cosr);
        shape.lineTo(-radius*sinr, radius*cosr);

        let extrudeSettings = {
            steps: 1,
            depth: depth,
            bevelEnabled: false,
            //bevelThickness: 1,
            //bevelSize: 1,
            //bevelOffset: 0,
            //bevelSegments: 1
        };

        super(shape, extrudeSettings);
        this.rotateX(-Math.PI/2);
    }
}
const radius = .038;
const depth = .005;
let geometry = new hexGeometry(radius, depth);
//let geometry = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings );

const BRICK= "brick";
const WOOD= "wood";
const WHEAT= "wheat";
const WOOL= "wool";
const ROCK= "rock";
const DESERT= "desert";
const WATER = "water";

const TileColors = {
    0x880000: 3, //brick
    0x964B00: 4, //wood
    0xF5DEB3: 4, //wheat,
    0x90ee90: 4, //sheep
    0xa9a9a9: 3, //rock
    0xc2b280: 1 //desert
};


const brickMaterial = new THREE.MeshPhongMaterial({color:0x880000});
const woodMaterial = new THREE.MeshPhongMaterial({color:0x165B00});
const wheatMaterial = new THREE.MeshPhongMaterial({color:0xffff00});
const rockMaterial = new THREE.MeshPhongMaterial({color:0x666666});
const sheepMaterial = new THREE.MeshPhongMaterial({color:0x90ee90});
const desertMaterial = new THREE.MeshPhongMaterial({color:0x777700});
const waterMaterial = new THREE.MeshPhongMaterial({color:0x0820ff});

class hex extends THREE.Object3D {
    constructor(resource="desert", number=0){
        super()
        let material = desertMaterial;
        switch(resource){
            case BRICK: material = brickMaterial; break;
            case WOOD: material = woodMaterial; break;
            case WHEAT: material = wheatMaterial; break;
            case WOOL: material = sheepMaterial; break;
            case ROCK: material = rockMaterial; break;
            case WATER: material = waterMaterial; break;
            default: material = desertMaterial;
        }
        this.add(new THREE.Mesh(geometry, material))
        this.userData.resource = resource;
        this.userData.number = number;
        //this.rotation.x = - Math.PI / 2; //+y is up
        
        //draw number
        if(number > 0){
            let color = 'black';
            if(number == 6 || number == 8) color = 'red';
            let t = new PlaneText(""+number, radius/2, color);
            
            t.position.y = depth*1.05;
            this.add(t);
        }
    }

    adjustXY(x,y){
        this.position.x += x*2*radius*sinr;
        this.position.z += y*radius*3/2;
    }
}

export default hex;