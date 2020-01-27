import * as THREE from './build/three.module.js';

import Stats from './jsm/libs/stats.module.js';
import { GUI } from './jsm/libs/dat.gui.module.js';

import { OrbitControls } from './jsm/controls/OrbitControls.js';
import {VRButton} from './jsm/webxr/VRButton.js'


import Game from  './game.mjs';



import socket from './clientSocket.mjs'

//import {setSyncedSocket,syncedRegisterHandler,synced} from './syncedObject.mjs';
//setSyncedSocket(socket);
//syncedRegisterHandler(socket);
//window.synced = synced;


var params = {
	enableWind: true,
	showBall: false
};



let game = new Game();
window.g = game;
socket.game = game;

var container, stats;
var camera, scene, renderer;


init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	// scene

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xcce0ff );
	//scene.fog = new THREE.Fog( 0xcce0ff, 70, 200 );
	window.s = scene;

	// camera

	camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, .01, 1000 );
	camera.position.set( 2, 1.8, 2 );
	scene.add(camera);
	//let a = new THREE.Mesh(new THREE.CubeGeometry(.1,.1,.1,1,1,1), new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide}));
	//a.position.z -= 1;
	//camera.add(new THREE.AxesHelper(5));
	//camera.add(a);


	// lights

	scene.add( new THREE.AmbientLight( 0x666666 ) );

	var light = new THREE.DirectionalLight( 0xdfebff, 1 );
	light.position.set( 50, 200, 100 );
	light.position.multiplyScalar( 1.3 );

	//light.castShadow = true;

	//light.shadow.mapSize.width = 1024;
	//light.shadow.mapSize.height = 1024;

	var d = 300;

	//light.shadow.camera.left = - d;
	//light.shadow.camera.right = d;
	//light.shadow.camera.top = d;
	//light.shadow.camera.bottom = - d;

	//light.shadow.camera.far = 1000;

	scene.add( light );


	//objects 
	var loader = new THREE.TextureLoader();


	var groundTexture = loader.load( 'js/textures/terrain/grasslight-big.jpg' );
	groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set( 25, 25 );
	groundTexture.anisotropy = 16;
	groundTexture.encoding = THREE.sRGBEncoding;

	var groundMaterial = new THREE.MeshLambertMaterial( { map: groundTexture } );

	var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 200, 200 ), groundMaterial );
	//mesh.position.y = - 250;
	mesh.rotation.x = - Math.PI / 2;
	//mesh.receiveShadow = true;
	//scene.add( mesh );

	
	// renderer

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	container.appendChild( renderer.domElement );

	renderer.outputEncoding = THREE.sRGBEncoding;

	renderer.shadowMap.enabled = true;

	// controls //TODO change to first persion controls
	var controls = new OrbitControls( camera, renderer.domElement );
	controls.maxPolarAngle = Math.PI ;//* 0.5;
	controls.minDistance = .1;
	controls.maxDistance = 50;
	controls.target.y=.1;

	// performance monitor

	stats = new Stats();
	container.appendChild( stats.dom );

	//

	window.addEventListener( 'resize', onWindowResize, false );

	//
	params.connect = function(){
		if(game.myObj.controllers.length == 0){
			game.myObj.addController();
		}
		game.myObj.controllers[0].connect();
	};
	var gui = new GUI();
	//gui.add( params, 'enableWind' );
	//gui.add( params, 'showBall' );
	gui.add( params, 'connect');
	

	//VR stuff
	renderer.xr.enabled = true;
	document.body.appendChild(VRButton.createButton(renderer));
	renderer.setAnimationLoop(animate)

	game.init(socket, scene, camera);
	//scene.add(game.board);
	console.log(scene);
	console.log(game);


}

//

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {
	var time = Date.now();

	render();
	stats.update();

}

function render() {

	game.myObj.position.copy(camera.position);
    game.myObj.setRotationFromEuler(camera.rotation);

	renderer.render( scene, camera );

}