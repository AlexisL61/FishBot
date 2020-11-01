const Canvas = require("canvas");
var client
async function hebergImg(canvas){
	var messageSent = await client.channels.cache.get("770686407043579915").send({"files":[canvas.toBuffer()]})
  return messageSent.attachments.first().url
}
var cache = {"fishImageCache":{}}

module.exports={
	canvasInit: function(c){
		client = c
	},
	generateAquarium : async function(inventory){
		var size = {"1":100,"2":125,"3":150,"4":175,"5":200,"6":250,"6 (Fin)":250,"Narrow":150}
		const canvas = Canvas.createCanvas(600, 350);
    const ctx = canvas.getContext('2d');
		var backgroundImg
			if (!cache.fishImageCache["https://cdn.discordapp.com/attachments/760153787632713748/770684499725123594/AquaBackground.png"]){
				backgroundImg = await Canvas.loadImage("https://cdn.discordapp.com/attachments/760153787632713748/770684499725123594/AquaBackground.png")
				cache.fishImageCache["https://cdn.discordapp.com/attachments/760153787632713748/770684499725123594/AquaBackground.png"] = backgroundImg
			}else{
				backgroundImg = cache.fishImageCache["https://cdn.discordapp.com/attachments/760153787632713748/770684499725123594/AquaBackground.png"]
			}
		ctx.drawImage(backgroundImg, 0,0,600,350);

		for (var i in inventory){
			var thisFish = inventory[i]
			var randomX = Math.random()*(600 - size[thisFish.data.size])
			var randomY = Math.random()*(350-size[thisFish.data.size])
			var randomRotate = Math.random()*90 - 45
			const fcanvas = Canvas.createCanvas(1000, 1000);
    	const fctx = fcanvas.getContext('2d'); 
			console.log(thisFish.data.image)
			var fishImg
			if (!cache.fishImageCache[thisFish.data.image]){
				fishImg = await Canvas.loadImage(thisFish.data.image)
				cache.fishImageCache[thisFish.data.image] = fishImg
			}else{
				fishImg = cache.fishImageCache[thisFish.data.image]
			}
			fctx.save();
			fctx.translate(250, 250);
			var randomNumber = Math.floor(Math.random()*2)
			if (randomNumber == 1){
				fctx.scale(-1,1)
			}
    	fctx.rotate(randomRotate*Math.PI/180); // rotate
    	fctx.drawImage(fishImg,0,0,250,250); // draws a chain link or dagger
			fctx.restore();
    	ctx.drawImage(fcanvas, randomX,randomY,size[thisFish.data.size]*2,size[thisFish.data.size]*2);
		}
		var returnImg = (await hebergImg(canvas))
		console.log(returnImg)
		return returnImg
	},
	generateBibliotheque : async function(fishList,biblio){
		const canvas = Canvas.createCanvas(1000,800);
		const ctx = canvas.getContext('2d');
		for (var y = 0; y<8;y++){
			for (var x=0;x<10;x++){
					ctx.rect(10+x*100,10+y*100,80,80)
					ctx.fillStyle = '#52E1DC';
					ctx.fill();
			}
		}
		for (var y = 0; y<8;y++){
			for (var x=0;x<10;x++){
				if (biblio.find(fish=>fish.data.id == fishList[x+y*10].id)){
					var fishImg
					if (!cache.fishImageCache[thisFish.data.image]){
						fishImg = await Canvas.loadImage(thisFish.data.image)
						cache.fishImageCache[thisFish.data.image] = fishImg
					}else{
						fishImg = cache.fishImageCache[thisFish.data.image]
					}
					ctx.drawImage(fishImage, x*100+20,y*100+20,60,60);
				}else{
					ctx.textAlign = "center"
					ctx.font = '60px Roboto ';
					ctx.fillStyle = '#ffffff';
					ctx.fillText(x+1+y*10, x*100+50,y*100+70);
				}
			}
		}
		var returnImg = (await hebergImg(canvas))
		return returnImg
	},
	generateProfil : async function(player,user){
		console.log(player)
		const canvas = Canvas.createCanvas(800,200);
		const ctx = canvas.getContext('2d');
		console.log(user.displayAvatarURL())
		var backgroundImg =  await Canvas.loadImage("https://wallpapercave.com/wp/wp4462550.png")
		ctx.drawImage(backgroundImg,0,0,800,449)
		var profileImage = await Canvas.loadImage(user.displayAvatarURL({"format":"png"}))
		ctx.drawImage(profileImage,0,0,200,200)
		ctx.font = '50px Roboto ';	
		ctx.fillStyle = '#ffffff';	
		ctx.fillText(user.username, 220, 50)
		var coinImage = await Canvas.loadImage("https://cdn.discordapp.com/attachments/760153787632713748/771444541592436736/Coin.svg")
		ctx.drawImage(coinImage,220,75,50,50)
		ctx.font = '50px Roboto ';	
		ctx.fillStyle = '#ffac33';	
		ctx.fillText(player.money, 280, 115)
		var ticketImage = await Canvas.loadImage("https://cdn.discordapp.com/attachments/760153787632713748/772155768799232000/Ticket.svg")
		ctx.drawImage(ticketImage,220,140,50,50)
		ctx.font = '50px Roboto ';	
		ctx.fillStyle = '#d2364d';	
		ctx.fillText(player.tickets, 280, 180)
		var returnImg = (await hebergImg(canvas))
		return returnImg
	}
}