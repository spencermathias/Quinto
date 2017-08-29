function Rect (
		x = 100, 
		y = 100, 
		width = 200, 
		height = 200, 
		rotate = 0, 
		fillColor = '#ffffff', 
		strokeColor = '#000000',
		lineWidth = 1
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
	this.canvas.width = document.body.clientWidth;
	this.canvas.height = document.body.clientHeight;
	this.ctx = this.canvas.getContext("2d");
	this.drawOffScreen();
}

Rect.prototype.drawOffScreen = function(){
	this.boundingRadius = Math.sqrt(.25*this.width*this.width+.25*this.height*this.height);
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
	};
	
	this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
	this.ctx.save();
	
	this.ctx.translate(this.x,this.y);
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
	
	//this.ctx.strokeRect(this.boundingBox.minX,this.boundingBox.minY,this.boundingBox.width, this.boundingBox.height);
}

Rect.prototype.copyToScreen = function(ScreenCtx){
	ScreenCtx.drawImage(this.canvas, 0, 0);
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