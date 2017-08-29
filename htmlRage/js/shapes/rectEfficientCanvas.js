function Rect (
		x = 300, 
		y = 300, 
		width = 200, 
		height = 300, 
		rotate = 0, 
		fillColor = '#00ff00', 
		strokeColor = '#0000ff',
		lineWidth = 30
	){
	this.type = "Rect";
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.rotate = rotate;
	this.fillColor = fillColor;
	this.strokeColor = strokeColor;
	this.lineWidth = lineWidth;
	
	this.canvas = document.createElement("canvas");
	this.ctx = this.canvas.getContext("2d");
	
	this.drawOffScreen();
}

Rect.prototype.drawOffScreen = function(){
	this.boundingRadius = Math.sqrt(Math.pow((this.width+.5*this.lineWidth)/2,2)+Math.pow((this.height+.5*this.lineWidth)/2,2));
	this.canvas.width = this.boundingRadius*2 + this.lineWidth;
	this.canvas.height = this.boundingRadius*2 + this.lineWidth;
	
	
	var dx1 = Math.abs((this.width/2)*Math.cos(this.rotate)+(this.height/2)*Math.sin(this.rotate));
	var dy1 = Math.abs((this.width/2)*Math.sin(this.rotate)+(this.height/2)*Math.cos(this.rotate));
	var dx2 = Math.abs((-this.width/2)*Math.cos(this.rotate)+(this.height/2)*Math.sin(this.rotate));
	var dy2 = Math.abs((-this.width/2)*Math.sin(this.rotate)+(this.height/2)*Math.cos(this.rotate));
	var maxdx = Math.max(dx1,dx2);
	var maxdy = Math.max(dy1,dy2);

	this.boundingBox = {
		minX:-maxdx+this.boundingRadius,
		minY:-maxdy+this.boundingRadius,
		maxX:maxdx+this.boundingRadius,
		maxY:maxdy+this.boundingRadius,
		width: 2*maxdx,
		height: 2*maxdy
	};
	
	//this.ctx.clearRect(this.boundingBox.minX,this.boundingBox.minY, this.boundingBox.width, this.boundingBox.height);
	this.ctx.clearRect(0,0,1000,1000);
	this.ctx.save();
	//this.ctx.translate(this.x+this.width/2,this.y+this.height/2);
	this.ctx.translate(this.canvas.width/2,this.canvas.height/2);
	this.ctx.rotate(this.rotate); //in radians
	
	if (this.strokeColor != 'none'){
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.strokeStyle = this.strokeColor;
		this.ctx.strokeRect(-this.width/2,-this.height/2,this.width,this.height);
	}
	if (this.fillColor != 'none'){
		this.ctx.fillStyle = this.fillColor;
		this.ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
	}
	
	this.ctx.restore();
	
	this.ctx.strokeRect(this.boundingBox.minX,this.boundingBox.minY,this.boundingBox.width, this.boundingBox.height);
	this.ctx.strokeRect(0,0, this.canvas.width-1, this.canvas.height-1);
	
}

Rect.prototype.copyToScreen = function(ScreenCtx){
	ScreenCtx.drawImage(this.canvas, this.x - this.canvas.width/2, this.y - this.canvas.height/2);
}

Rect.prototype.checkHit = function(targetX,targetY){
	var hit = false;
	if (targetX > this.boundingBox.minX && targetX < this.boundingBox.maxX &&
		targetY > this.boundingBox.minY && targetY < this.boundingBox.maxY){
			var imageData = this.ctx.getImageData(targetX,targetY,1,1);
			if (imageData.data[3] != 0) {hit = true;}
			//console.log(imageData);
	}
	return hit;
}