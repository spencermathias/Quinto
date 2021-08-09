import * as THREE from '../../build/three.module.js';
/**
 * @author mrdoob / http://mrdoob.com/
 */

//let mesh, button1, button2, button3, touch;

let loader = new THREE.BufferGeometryLoader();
class DaydreamController extends THREE.Group {
    constructor(){
        super();
        
        this.add(new THREE.AxesHelper(20));
        loader.load( './js/vrMJS/daydream/daydream.json', function ( geometry ) {
            console.log(geometry);
            let material = new THREE.MeshPhongMaterial( { color: 0x888899, shininess: 15, side: THREE.DoubleSide } );
            //geometry = new THREE.CubeGeometry(.5,.5,.5,1,1,1);
            this.mesh = new THREE.Mesh( geometry, material );
            this.rotation.x = Math.PI / 2;
            this.add( this.mesh );
        
            geometry = new THREE.CircleBufferGeometry( 0.00166, 24 );
            this.button1 = new THREE.Mesh( geometry, material.clone() );
            this.button1.position.y = 0.0002;
            this.button1.position.z = - 0.0035;
            this.button1.rotation.x = - Math.PI / 2;
            this.mesh.add( this.button1 );
        
            geometry = new THREE.CircleBufferGeometry( 0.00025, 24 );
            this.touch = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { blending: THREE.AdditiveBlending, opacity: 0.2, transparent: true } ) );
            this.touch.position.z = 0.0001;
            this.touch.visible = false;
            this.button1.add( this.touch );
        
            geometry = new THREE.CircleBufferGeometry( 0.0005, 24 );
            this.button2 = new THREE.Mesh( geometry, material.clone() );
            this.button2.position.y = 0.0002;
            this.button2.position.z = - 0.0008;
            this.button2.rotation.x = - Math.PI / 2;
            this.mesh.add( this.button2 );
        
            this.button3 = new THREE.Mesh( geometry, material.clone() );
            this.button3.position.y = 0.0002;
            this.button3.position.z = 0.0008;
            this.button3.rotation.x = - Math.PI / 2;
            this.mesh.add( this.button3 );

            //scale to real size
            this.scale.x = 6;
            this.scale.y = 6;
            this.scale.z = 6;
        }.bind(this));

        this.state = {};

        this.axis = new THREE.Vector3();
        this.quaternion2 = new THREE.Quaternion();
        this.quaternionHome = new THREE.Quaternion();

        this.initialised = false;
        this.timeout = null;
    }

    setPositionAndRotation(pos){
        //console.log(pos);
        this.position.x = pos.p.x;
        this.position.y = pos.p.y;
        this.position.z = pos.p.z;

        this.setRotationFromEuler(new THREE.Euler(pos.r.x,pos.r.y,pos.r.z,'XYZ'));
    }

	connect() {

		return navigator.bluetooth.requestDevice( {
			filters: [ {
				name: 'Daydream controller'
			} ],
			optionalServices: [ 0xfe55 ]
		} )
		.then( function ( device ) {
			return device.gatt.connect();
		} )
		.then( function ( server ) {
			return server.getPrimaryService( 0xfe55 );
		} )
		.then( function ( service ) {
			return service.getCharacteristic( '00000001-1000-1000-8000-00805f9b34fb' );
		} )
		.then( function ( characteristic ) {
			characteristic.addEventListener( 'characteristicvaluechanged', this.handleData.bind(this) );
			return characteristic.startNotifications();
		}.bind(this) )

	}

	handleData( event ) {
        //console.log(this);

		let data = event.target.value;

		// http://stackoverflow.com/questions/40730809/use-daydream-controller-on-hololens-or-outside-daydream/40753551#40753551

		this.state.isClickDown = (data.getUint8(18) & 0x1) > 0;
		this.state.isAppDown = (data.getUint8(18) & 0x4) > 0;
		this.state.isHomeDown = (data.getUint8(18) & 0x2) > 0;
		this.state.isVolPlusDown = (data.getUint8(18) & 0x10) > 0;
		this.state.isVolMinusDown = (data.getUint8(18) & 0x8) > 0;

		this.state.time = ((data.getUint8(0) & 0xFF) << 1 | (data.getUint8(1) & 0x80) >> 7);

		this.state.seq = (data.getUint8(1) & 0x7C) >> 2;

		this.state.xOri = (data.getUint8(1) & 0x03) << 11 | (data.getUint8(2) & 0xFF) << 3 | (data.getUint8(3) & 0x80) >> 5;
		this.state.xOri = (this.state.xOri << 19) >> 19;
		this.state.xOri *= (2 * Math.PI / 4095.0);

		this.state.yOri = (data.getUint8(3) & 0x1F) << 8 | (data.getUint8(4) & 0xFF);
		this.state.yOri = (this.state.yOri << 19) >> 19;
		this.state.yOri *= (2 * Math.PI / 4095.0);

		this.state.zOri = (data.getUint8(5) & 0xFF) << 5 | (data.getUint8(6) & 0xF8) >> 3;
		this.state.zOri = (this.state.zOri << 19) >> 19;
		this.state.zOri *= (2 * Math.PI / 4095.0);

		this.state.xAcc = (data.getUint8(6) & 0x07) << 10 | (data.getUint8(7) & 0xFF) << 2 | (data.getUint8(8) & 0xC0) >> 6;
		this.state.xAcc = (this.state.xAcc << 19) >> 19;
		this.state.xAcc *= (8 * 9.8 / 4095.0);

		this.state.yAcc = (data.getUint8(8) & 0x3F) << 7 | (data.getUint8(9) & 0xFE) >>> 1;
		this.state.yAcc = (this.state.yAcc << 19) >> 19;
		this.state.yAcc *= (8 * 9.8 / 4095.0);

		this.state.zAcc = (data.getUint8(9) & 0x01) << 12 | (data.getUint8(10) & 0xFF) << 4 | (data.getUint8(11) & 0xF0) >> 4;
		this.state.zAcc = (this.state.zAcc << 19) >> 19;
		this.state.zAcc *= (8 * 9.8 / 4095.0);

		this.state.xGyro = ((data.getUint8(11) & 0x0F) << 9 | (data.getUint8(12) & 0xFF) << 1 | (data.getUint8(13) & 0x80) >> 7);
		this.state.xGyro = (this.state.xGyro << 19) >> 19;
		this.state.xGyro *= (2048 / 180 * Math.PI / 4095.0);

		this.state.yGyro = ((data.getUint8(13) & 0x7F) << 6 | (data.getUint8(14) & 0xFC) >> 2);
		this.state.yGyro = (this.state.yGyro << 19) >> 19;
		this.state.yGyro *= (2048 / 180 * Math.PI / 4095.0);

		this.state.zGyro = ((data.getUint8(14) & 0x03) << 11 | (data.getUint8(15) & 0xFF) << 3 | (data.getUint8(16) & 0xE0) >> 5);
		this.state.zGyro = (this.state.zGyro << 19) >> 19;
		this.state.zGyro *= (2048 / 180 * Math.PI / 4095.0);

		this.state.xTouch = ((data.getUint8(16) & 0x1F) << 3 | (data.getUint8(17) & 0xE0) >> 5) / 255.0;
		this.state.yTouch = ((data.getUint8(17) & 0x1F) << 3 | (data.getUint8(18) & 0xE0) >> 5) / 255.0;

		this.onStateChangeCallback( this.state );

	}

    //onStateChange ( callback ) {
    //    this.onStateChangeCallback = callback;
    //}


    onStateChangeCallback(state){
        //textarea.textContent = JSON.stringify( state, null, '\t' );
        if ( this.mesh !== undefined ) {

            let angle = Math.sqrt( state.xOri * state.xOri + state.yOri * state.yOri + state.zOri * state.zOri );

            if ( angle > 0 ) {

                this.axis.set( state.xOri, state.yOri, state.zOri )
                this.axis.multiplyScalar( 1 / angle );

                this.quaternion2.setFromAxisAngle( this.axis, angle );

                if ( this.initialised === false ) {

                    this.quaternionHome.copy( this.quaternion2 );
                    this.quaternionHome.inverse();

                    this.initialised = true;

                }

            } else {
                this.quaternion2.set( 0, 0, 0, 1 );
            }

            if ( this.state.isHomeDown ) {

                if ( this.timeout === null ) {

                    this.timeout = setTimeout( function () {

                        this.quaternionHome.copy( this.quaternion2 );
                        this.quaternionHome.inverse();

                    }.bind(this), 1000 );

                }

            } else {

                if ( this.timeout !== null ) {
                    clearTimeout( this.timeout );
                    this.timeout = null;
                }

            }

            this.quaternion.copy( this.quaternionHome );
            this.quaternion.multiply( this.quaternion2 );

            this.button1.material.emissive.g = this.state.isClickDown ? 0.5 : 0;
            this.button2.material.emissive.g = this.state.isAppDown ? 0.5 : 0;
            this.button3.material.emissive.g = this.state.isHomeDown ? 0.5 : 0;

            this.touch.position.x = ( this.state.xTouch * 2 - 1 ) / 1000;
            this.touch.position.y = - ( this.state.yTouch * 2 - 1 ) / 1000;

            this.touch.visible = this.state.xTouch > 0 && this.state.yTouch > 0;

        }
    }
}

export default DaydreamController;
