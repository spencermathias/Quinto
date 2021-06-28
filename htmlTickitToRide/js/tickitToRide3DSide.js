var publicAddress = window.location.href;
var internalAddress = 'http://localhost:8080/';

class train{
	constructor(color,type,x,y,z,length){
		this.color = color;
		this.type = type;
		this.x = x;
		this.y = y;
		this.z = z;
	}
	draw(){
		var ballGeometry = new THREE.SphereGeometry(2,64,64);
		var meterial = new THREE.MeshBasicMaterial({color:this.color});
		var sphere = new THREE.Mesh(ballGeometry,meterial);
		threeDShapes.push(sphere);
		
	}
}

var camera = new THREE.PerspectiveCamera(75,1,0.1,1000);
var socket = io(publicAddress);
var threeDShapes = [];
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
var threeDCanvas = renderer.domElement;
var light = new THREE.AmbientLight();
$('#3DCanvas').append(renderer.domElement);

socket.on('startGame',function(){
	resizeCanvas();
});

socket.on('showBoard',function(){
	resizeCanvas();
});

function resizeCanvas(){
	camera = new THREE.PerspectiveCamera(75,$('3DCanvas').width() / $('3DCanvas').height(),0.1,1000);
	renderer.setSize($('3DCanvas').width(),$('3DCanvas').height());
}

function addShapes(){
	threeDShapes.forEach(function(shape){
		scene.add(shape);
	});
	setTimeout(addShapes,100);
}

function animate(){
	requestAnimationFrame(animate);
	renderer.render(scene,camera);
}

animate();