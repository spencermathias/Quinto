function Text (
		x = 100, 
		y = 100, 
		text = 'text',
		fontSize = 10,
		fontStyle = "Arial Black, Gadget, Arial, sans-serif",
		textAlign = "center",
		textBaseline = "middle",
		rotate = 0, 
		fillColor = '#ffffff', 
		strokeColor = '#000000',
		lineWidth = 1
	){
	this.type = "Text";
	this.x = x;
	this.y = y;
	this.text = text;
	this.fontSize = fontSize;
	this.fontStyle = fontStyle;
	
	this.textAlign = textAlign;
	this.textBaseline = textBaseline;
	this.rotate = rotate;
	this.fillColor = fillColor;
	this.strokeColor = strokeColor;
	this.lineWidth = lineWidth;
	
	this.canvas = document.createElement("canvas");
	this.canvas.width = document.body.clientWidth;
	this.canvas.height = document.body.clientHeight;
	this.ctx = this.canvas.getContext("2d");
	this.drawOffScreen();
}

Text.prototype.drawOffScreen = function(){
	/*this.boundingRadius = Math.sqrt(.25*this.width*this.width+.25*this.height*this.height);
	var dx1 = Math.abs((this.width/2)*Math.cos(this.rotate)+(this.height/2)*Math.sin(this.rotate));
	var dy1 = Math.abs((this.width/2)*Math.sin(this.rotate)+(this.height/2)*Math.cos(this.rotate));
	var dx2 = Math.abs((-this.width/2)*Math.cos(this.rotate)+(this.height/2)*Math.sin(this.rotate));
	var dy2 = Math.abs((-this.width/2)*Math.sin(this.rotate)+(this.height/2)*Math.cos(this.rotate));
	var maxdx = Math.max(dx1,dx2);
	var maxdy = Math.max(dy1,dy2);

	this.boundingBox = {
		minX:this.x-maxdx,
		minY:this.y-maxdy,
		maxX:this.x+maxdx,
		maxY:this.y+maxdy,
		width: 2*maxdx,
		height: 2*maxdy
	};*/
	
	//this.ctx.clearRect(this.boundingBox.minX,this.boundingBox.minY, this.boundingBox.width, this.boundingBox.height);
	this.trueY = this.y - this.fontSize*.04
	this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
	this.ctx.save();
	this.ctx.textAlign = this.textAlign;
	this.ctx.textBaseline = this.textBaseline;
	this.ctx.font = "" + this.fontSize + "px " + this.fontStyle;;
	this.ctx.translate(this.x,this.trueY);
	this.ctx.rotate(this.rotate); //in radians
	
	if (this.strokeColor != 'none'){
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.strokeStyle = this.strokeColor;
		this.ctx.strokeText(this.text, 0, 0);
	}
	if (this.fillColor != 'none'){
		this.ctx.fillStyle = this.fillColor;
		this.ctx.fillText(this.text, 0,0);
	}
	
	this.ctx.restore();
	
	//this.ctx.strokeRect(this.boundingBox.minX,this.boundingBox.minY,this.boundingBox.width, this.boundingBox.height);
}

Text.prototype.copyToScreen = function(ScreenCtx){
	ScreenCtx.drawImage(this.canvas, 0, 0);
}

Text.prototype.checkHit = function(targetX,targetY){
	var hit = false;
	//if (targetX > this.boundingBox.minX && targetX < this.boundingBox.maxX &&
	//	targetY > this.boundingBox.minY && targetY < this.boundingBox.maxY){
	var imageData = this.ctx.getImageData(targetX,targetY,1,1);
	if (imageData.data[3] != 0) {hit = true;}
			//console.log(imageData);
	//}
	return hit;
}