import * as THREE from '../build/three.module.js';


const radius = .075;
const depth = .01;
const sinr = Math.sin(Math.PI/3);

const sinr6 = Math.sin(Math.PI/6);

class roadGeometry extends THREE.ExtrudeBufferGeometry{
    constructor(radius, depth, rot){
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
        this.rot
        this.rotateX(-Math.PI/2);
        this.rotateY(rot);
    }
}


let material = new THREE.MeshPhongMaterial({color:0x111111});

class Road extends THREE.Object3D {
    constructor(rot){
        super();
        let geometry = new roadGeometry(radius, depth, rot);
        this.add(new THREE.Mesh(geometry, material))
        //this.rotation.x = - Math.PI / 2; //+y is up
    }

    adjustXY(x,y,i){
        //this.visible = false;

        let y2 = 0;
        let x2 = 0;

        switch(i){
            case 0: x2 -= 0.25; y2 += 1; this.visible=true; break;
            case 1: x2 += 0.25; y2 += 1; break;
            case 2: x2 += 0.5; y2 += 0; break;
            case 3: x2 += 0.25; y2 -= 1; break;
            case 4: x2 -= 0.25; y2 -= 1; break;
            case 5: x2 -= 0.5; y2 -= 0; break;
        }

        this.position.x = x*2*radius*sinr + x2*2*radius*sinr;
        this.position.z = y*radius*3/2 + y2*radius*(1-sinr6/2);
        this.position.y = depth;

        //console.log(this);
    }
}

export default Road;