function UI(canvas) {
	this.canvas = canvas;
	this.ctx = this.canvas.getContext("2d");
	console.log('test ui constructor',this);
	this.items = [];
}

UI.prototype.draw = function(){
	//console.log('drawing', this);
	//this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
	this.ctx.clearRect(0,0, 10000, 10000);
	//console.log('test ui function', this);

	for( var i = 0; i < this.items.length; i++ ){
		this.items[i].copyToScreen(this.ctx);
	}
	//console.log('done drawing');
}

UI.prototype.add = function (shape){
	this.items.push(shape); //todo add z binning
}

UI.prototype.getClicked = function(eventIn){
	var clicked = [];
	for( var i = 0; i < this.items.length; i++ ){
		if(this.items[i].checkHit(eventIn.clientX, eventIn.clientY)){
			clicked.push(this.items[i]);
		}
	}
	console.log('clicked:',clicked);
}

UI.prototype.updateCanvas = function(){
	for( var i = 0; i < this.items.length; i++ ){
		this.items[i].canvas.width = this.canvas.width;
		this.items[i].canvas.height = this.canvas.height;
		this.items[i].drawOffScreen();
	}
}