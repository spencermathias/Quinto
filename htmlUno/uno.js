class tile{
	constructor(x,y,width,hight,fillColor,outlineColor,text,textColor,textOutlineColor,textSize,textSlant){
		this.x = x;
		this.y = y;
		this.width = width;
		this.hight = hight;
		this.fillColor = fillColor;
		this.outlineColor = outlineColor;
		this.text = text;
		this.textColor = textColor;
		this.textOutlineColor = textOutlineColor;
		this.textSize = textSize;
		this.textSlant = textSlant;
	}
	draw(){
		ctx.fillRect(x,y,width,hight);
		ctx.fillStyle = fillColor;
		ctx.strokeStyle = outlineColor;
		ctx.font = '15px Arial';
		ctx.fillText(text,0,0);
		ctx.strokeText(text,0,0);
}

socet.on(showTiles,function(tiles){
	draw(tile);
});

function draw(,tiles){
	tiles.forEach(
		var tile = new classIn(
		(
			ctx.fillRect(
	)
}