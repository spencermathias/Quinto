import * as THREE from '../build/three.module.js';

class PlaneText extends THREE.Object3D{
    constructor(text, textSize, textcolor){
        super();
        let scale = 10000;
        let fontString = ""+Math.floor(textSize*scale)+"px Arial";
        //console.log(fontString)

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = fontString;
        let tSize = ctx.measureText(text);
        canvas.width = tSize.width;
        canvas.height = textSize*scale;
        //console.log(canvas)
        //ctx.strokeStyle = 'red';
        //ctx.strokeRect(0, 0, canvas.width, canvas.height);
        //ctx.fillStyle = 'white';
        //ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
        ctx.fillStyle = textcolor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = fontString;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        var material = new THREE.MeshBasicMaterial({ map: texture, transparent:true });
        let geometry = new THREE.PlaneGeometry( canvas.width/scale, canvas.height/scale, 1,1 );
        let mesh = new THREE.Mesh(geometry, material);
        this.add(mesh);
        //this.mesh = new THREE.Mesh( geometry, material );
    }
}

export default PlaneText;