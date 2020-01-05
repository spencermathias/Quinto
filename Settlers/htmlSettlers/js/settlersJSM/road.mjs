import * as THREE from '../build/three.module.js';
import PlaneText from '../settlersJSM/text.mjs';

const radius = .075;
const depth = .01;

class roadGeometry extends THREE.ExtrudeBufferGeometry{
    constructor(radius, depth){
        let shape = new THREE.Shape();
        shape.moveTo(-depth/2,radius/2);
        shape.lineTo(depth/2, radius/2);
        shape.lineTo(depth/2, -radius/2);
        shape.lineTo(-depth/2, -radius/2);

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
    }
}

let geometry = new roadGeometry(radius, depth);
let material = new THREE.MeshPhongMaterial({color:0x111111});

class Road extends THREE.Object3D {
    constructor(){
        super();
        this.add(new THREE.Mesh(geometry, material))
        this.rotation.x = - Math.PI / 2; //+y is up
    }
}

export default Road;