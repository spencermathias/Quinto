import * as THREE from '../build/three.module.js';


const radius = .075;
const depth = .01;
const sinr = Math.sin(Math.PI/3);

const sinr6 = Math.sin(Math.PI/6);

class townGeometry extends THREE.ExtrudeBufferGeometry{
    constructor(depth, rot){
        let shape = new THREE.Shape();
        shape.moveTo(-depth/2,0);
        shape.lineTo(-depth/2, depth);
        shape.lineTo( 0, 4*depth/3);
        shape.lineTo( depth/2, depth);
        shape.lineTo( depth/2,0);

        let townDepth = 4*depth/3;

        let extrudeSettings = {
            steps: 1,
            depth: townDepth,
            bevelEnabled: false,
            //bevelThickness: 1,
            //bevelSize: 1,
            //bevelOffset: 0,
            //bevelSegments: 1
        };

        super(shape, extrudeSettings);
        this.translate(0,0,-townDepth/2);
        //this.rotateX(-Math.PI/2);
        //this.rotateY(rot);
        
    }
}


let material = new THREE.MeshPhongMaterial({color:0x111111});

class Town extends THREE.Object3D {
    constructor(rot){
        super();
        let geometry = new townGeometry(2*depth, rot);
        this.add(new THREE.Mesh(geometry, material))
        //this.add(new THREE.AxesHelper(.1))
    }

    adjustXY(x,y,i){
        //this.visible = false;

        let y2 = 0;
        let x2 = 0;

        switch(i){
            case 0: x2 = 0; y2 = 1; break;
            case 1: x2 = 0.5; y2 = 0.5; this.visible=true; break;
            case 2: x2 = 0.5; y2 = -0.5; break;
            case 3: x2 = 0; y2 = -1; break;
            case 4: x2 = -0.5; y2 = -0.5; break;
            case 5: x2 = -0.5; y2 = 0.5; break;
        }

        this.position.x = x*2*radius*sinr + x2*2*radius*sinr;
        this.position.z = y*radius*3/2 + y2*radius;
        this.position.y = depth;

        //console.log(this);
    }
}

export default Town;