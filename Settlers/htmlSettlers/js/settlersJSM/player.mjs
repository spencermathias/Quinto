import * as THREE from '../build/three.module.js';
let height = .1;
let geometry = new THREE.ConeGeometry(.1,height,3); 

class Player extends THREE.Object3D {
    constructor(color){
        super()
        let material = new THREE.MeshPhongMaterial({color:color});
        let m = new THREE.Mesh(geometry, material);
        m.position.z = height/2;
        m.rotateX(-Math.PI/2);
        this.add(m)
        //this.add(new THREE.AxesHelper(.5));
        //this.userData.resource = resource;
    }

    setPositionAndRotation(pos){
        this.position.x = pos.x;
        this.position.y = pos.y;
        this.position.z = pos.z;

        this.setRotationFromEuler(new THREE.Euler(pos.rx,pos.ry,pos.rz,'XYZ'));
    }
}

export default Player;