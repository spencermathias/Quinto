import hex from '../settlersJSM/hex.mjs';
import * as THREE from '../build/three.module.js';

class Board extends THREE.Group {
    constructor(width, height){
        super();
        let h = new hex();
        this.add(h);
        //h.position.y = .1;
    }
}

export default Board;