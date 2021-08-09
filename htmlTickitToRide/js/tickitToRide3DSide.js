class train{
	constructor(color,type,x,y,z,length){
		this.type = type;
		this.ballGeometry = new THREE.SphereGeometry(2,64,64);
		this.material = new THREE.MeshBasicMaterial({color:color});
		this.sphere = new THREE.Mesh(this.ballGeometry,this.material);
	}
}
var camera;
var scene;
var renderer;
var socket;
var light;

function init(){
	var canvasWidth = $('#3DCanvas').width();
	var canvasHeight = $('#3DCanvas').height();
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 75, canvasWidth / canvasHeight, 0.1, 1000 );

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( canvasWidth,canvasHeight);
	$('#3DCanvas').append( renderer.domElement );
	light = new THREE.AmbientLight(0x404040);
	scene.add(light);

	var geometry = new THREE.BoxGeometry();
	var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	var cube = new THREE.Mesh( geometry, material );
	scene.add( cube );

	camera.position.z = 5;
	animate();
}

/*socket.on('startGame',function(){
	resizeCanvas();
});

socket.on('showBoard',function(){
	resizeCanvas();
});*/

function resizeCanvas3D(){
	renderer.setSize($('#3DCanvas').width(),$('#3DCanvas').height());
}

function animate(){
	requestAnimationFrame(animate);
	renderer.render(scene,camera);
}

init();

/*var blueTrain = new train(0xff0000,'head',0,0,0,1);
scene.add(blueTrain.sphere);*/