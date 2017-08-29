if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var camera, scene, renderer, controls;

var fallArea = 1000;
var maxSpeed = .05;
var rand = 0;

var snowflakes = new THREE.Object3D();

init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 20000 );
	camera.position.z = -100;
	camera.lookAt(0,0,0);
	
	controls = new THREE.OrbitControls( camera );

	scene = new THREE.Scene();

	var light, object;

	scene.add( new THREE.AmbientLight( 0x666666 ) );

	light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 0, 100, 0 );
	scene.add( light );
	
	scene.add(new THREE.AxisHelper());
	scene.add(snowflakes);
	//snowflakes.add(new THREE.AxisHelper(10));

	//var map = new THREE.TextureLoader().load( 'textures/UV_Grid_Sm.jpg' );
	//map.wrapS = map.wrapT = THREE.RepeatWrapping;
	//map.anisotropy = 16;

	var material = new THREE.MeshPhongMaterial()//new THREE.MeshLambertMaterial( { map: map, side: THREE.DoubleSide } );

	//

	var shape = new THREE.Shape();
	shape.moveTo( 0,0 );
	shape.lineTo( 1, 0 );
	shape.lineTo( 11, 10 );
	shape.lineTo( 15, 5 );
	shape.lineTo( 16, 6 );
	shape.lineTo( 11, 11 );
	shape.lineTo( 11, 15 );
	shape.lineTo( 10, 15 );
	shape.lineTo( 10, 10 );
	shape.lineTo( 5, 10 );
	shape.lineTo( 0, 0 );
	var thickness = 1;
	var extrudeSettings = {
		steps: 2,
		amount: thickness,
		bevelEnabled: false,
		bevelThickness: 1,
		bevelSize: 1,
		bevelSegments: 1
	};

	var snowflake = new THREE.Object3D();
	snowflake.translateY(50)
	var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	var material = new THREE.MeshPhongMaterial( { color: 0xffffff } );
	var mesh = new THREE.Mesh( geometry, material );
	mesh.geometry.translate(0,0,-thickness/2)
	var mesh2 = mesh.clone();
	for (var i = 0; i < 6; i++){
		mesh2 = mesh.clone();
		//mesh2.rotateX((i%2)*Math.PI)
		mesh2.rotateZ(i*Math.PI/3);
		snowflake.add(mesh2);
	}
	snowflakes.add( snowflake );
	var shape, shapeArray,extrudeSettings, geometry, awesome, center, vert;
	vert = 0;
	var extrudeSettings = { amount: 100, curveSegments: 2, bevelEnabled: false, bevelSegments: 0, steps: 1, bevelSize: 0, bevelThickness: 0 };
	for (var i = 0; i < svgArray.length; i++){
		console.log("snowflake", i);
		console.time("snowflake "+ i +" fromsvg");
		shapeArray = transformSVGPathExposed(svgArray[i]);
		console.timeEnd("snowflake "+ i +" fromsvg");
		shape = shapeArray[0];
		shape.holes = shapeArray.slice(1);
		//console.log("final shape", shape);
		
		console.time("make geometry");
		geometry = new THREE.ExtrudeBufferGeometry( shape, extrudeSettings );
		console.log("vertices",geometry);
		console.timeEnd("make geometry");
		console.time("center geometry");
		geometry.computeBoundingBox();
		center = geometry.boundingBox.getCenter();
		geometry.translate(-center.x, -center.y, -center.z);
		console.timeEnd("center geometry");
		console.time("scale geometry");
		geometry.scale(.01, .01, .01);
		console.timeEnd("scale geometry");
		console.time("make mesh");
		awesome = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial() );
		console.timeEnd("make mesh");
		snowflakes.add(awesome);
	}
	
	var length = snowflakes.children.length;
	var clones = 9;
	for ( var i = 0; i < length; i++){
		console.log(length);
		for( var j = 0; j < clones; j++){
			var duplicate = snowflakes.children[i].clone();
			snowflakes.add(duplicate);
		}
	}
	
	for ( var i = 0; i < snowflakes.children.length; i ++ ) {
		snowflakes.children[i].rx = 0;
		snowflakes.children[i].ry = 0;
		snowflakes.children[i].rz = 0;
		
		snowflakes.children[i].rotation.x = Math.random()*2*Math.PI;
		snowflakes.children[i].rotation.y = Math.random()*2*Math.PI;
		snowflakes.children[i].rotation.z = Math.random()*2*Math.PI;
		
		snowflakes.children[i].position.x = (Math.random() - .5)*fallArea;
		snowflakes.children[i].position.y = (Math.random() - .5)*fallArea;
		snowflakes.children[i].position.z = (Math.random() - .5)*fallArea;
	}
	
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	//

	window.addEventListener( 'resize', onWindowResize, false );
	
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

	requestAnimationFrame( animate );

	render();
	stats.update();

}


function render() {
	for ( var i = 0, l = snowflakes.children.length; i < l; i ++ ) {
		var object = snowflakes.children[ i ];
		rand = (Math.random() - 0.5)/1000;

		if(object.rx < maxSpeed && rand > 0){ object.rx += rand; }
		else if(object.rx > -maxSpeed && rand < 0){ object.rx += rand; }
		
		rand = (Math.random() - 0.5)/1000;
		if(object.ry < maxSpeed && rand > 0){ object.ry += rand; }
		else if(object.ry > -maxSpeed && rand < 0){ object.ry += rand; }
		
		rand = (Math.random() - 0.5)/1000;
		if(object.rz < maxSpeed && rand > 0){ object.rz += rand; }
		else if(object.rz > -maxSpeed && rand < 0){ object.rz += rand; }


		object.rotation.x += object.rx;
		object.rotation.y += object.ry;
		object.rotation.z += object.rz;
		
		if (object.position.y > -fallArea/2){
			object.position.y -= .5;
		} else {
			object.position.x = (Math.random() - .5)*fallArea;
			object.position.y = fallArea/2;
			object.position.z = (Math.random() - .5)*fallArea;
		}

	}

	renderer.render( scene, camera );

}