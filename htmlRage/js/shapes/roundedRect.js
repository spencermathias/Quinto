function RoundedRect (
		x = 200, 
		y = 200, 
		width = 200, 
		height = 200,
		radius = 10,
		rotate = Math.PI/3, 
		fillColor = '#ff00ff', 
		strokeColor = '#ff0000',
		lineWidth = 1
	){
	this.type = "RoundedRect";
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.rotate = rotate;
	this.fillColor = fillColor;
	this.strokeColor = strokeColor;
	this.lineWidth = lineWidth;
	
	if (typeof radius === 'number') {
		console.log('number');
		this.radius = {tl: radius, tr: radius, br: radius, bl: radius};
	} else {
		console.log('else');
		var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
		this.radius = {
			tl: radius[0] || defaultRadius.tl,
			tr: radius[1] || defaultRadius.tr,
			br: radius[2] || defaultRadius.br,
			bl: radius[3] || defaultRadius.bl
		}
	}
	
	this.canvas = document.createElement("canvas");
	this.canvas.width = document.body.clientWidth;
	this.canvas.height = document.body.clientHeight;
	this.ctx = this.canvas.getContext("2d");
	this.drawOffScreen();
}

RoundedRect.prototype.drawOffScreen = function(){
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
	
	//this.ctx.clearRect(this.boundingBox.minX,this.boundingBox.minY, this.boundingBox.width, this.boundingBox.height);
	this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
	this.ctx.save();
	//this.ctx.translate(this.x+this.width/2,this.y+this.height/2);
	this.ctx.translate(this.x,this.y);
	this.ctx.rotate(this.rotate); //in radians
	
	this.ctx.beginPath();
	this.ctx.moveTo(-this.width/2 + this.radius.tl, -this.height/2);
	this.ctx.lineTo( this.width/2 - this.radius.tr, -this.height/2);
	this.ctx.quadraticCurveTo(this.width/2, -this.height/2, this.width/2, -this.height/2 + this.radius.tr);
	this.ctx.lineTo( this.width/2, -this.height/2 + this.height - this.radius.br);
	this.ctx.quadraticCurveTo( this.width/2, this.height/2, this.width/2 - this.radius.br, this.height/2);
	this.ctx.lineTo(-this.width/2 + this.radius.bl, -this.height/2 + this.height);
	this.ctx.quadraticCurveTo(-this.width/2,  this.height/2, -this.width/2, this.height/2 - this.radius.bl);
	this.ctx.lineTo(-this.width/2, -this.height/2 + this.radius.tl);
	this.ctx.quadraticCurveTo(-this.width/2, -this.height/2, -this.width/2.+this.radius.tl, -this.height/2);
	this.ctx.closePath();

	
	if (this.fillColor != 'none') {
		this.ctx.fillStyle = this.fillColor;
		this.ctx.fill();
	}
	if (this.strokeColor != 'none') {
		this.ctx.lineWidth = this.lineWidth;
		this.ctx.strokeStyle = this.strokeColor;
		this.ctx.stroke();
	}
	
	this.ctx.restore();
	
	this.ctx.strokeRect(this.boundingBox.minX,this.boundingBox.minY,this.boundingBox.width, this.boundingBox.height);
}

RoundedRect.prototype.copyToScreen = function(ScreenCtx){
	ScreenCtx.drawImage(this.canvas, 0, 0);
}

RoundedRect.prototype.checkHit = function(targetX,targetY){
	var hit = false;
	if (targetX > this.boundingBox.minX && targetX < this.boundingBox.maxX &&
		targetY > this.boundingBox.minY && targetY < this.boundingBox.maxY){
			var imageData = this.ctx.getImageData(targetX,targetY,1,1);
			if (imageData.data[3] != 0) {hit = true;}
			//console.log(imageData);
	}
	return hit;
}