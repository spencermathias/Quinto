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

var socket = io(publicAddress);
var threeDShapes = [];
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75,canvas.width / canvas.height,0.1,1000);
var renderer = new THREE.WebGLRenderer();
var threeDCanvas = renderer.domElement;
var light = new THREE.
socket.on('startGame',function(){
	$('#3DCanvas').append(threeDCanvas);
	updateRenderSize();
});

function updateRenderSize(){
	renderer.setSize($('#3DCanvas').width(),$('#3DCanvas').height());
	setTimeout(updateRenderSize,1000);
}

function addShapes(){
	threeDShapes.forEach(function(shape){
		scene.add(shape);
	});
	setTimeout(addShapes,100);
}


function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene,camera);
}
animate();

var ballGeometry = new THREE.SphereGeometry(10,64,64);
var meterial = new THREE.MeshBasicMaterial({color:'#343434'});
var sphere = new THREE.Mesh(ballGeometry,meterial);
sphere.position(0,0,20);
threeDShapes.push(sphere);

addShapes();
