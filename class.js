var fishTable,playerList,fishPecheList,serverList,waitingFishList,client,bibliothequeFishList,questList,banniereList

var playerDataAvailable = [{"name":"id"},{"name":"money"},{"name":"tickets"},{"name":"banniere"}]

var guildCooldown = {}

const fs = require("fs");
var {functionsInit,getRandomFish,waitRandomTime,getFishRarity} = require("./fonctions.js")


var embedTable = JSON.parse(fs.readFileSync("./embeds.json"))
var fishSizeTable = JSON.parse(fs.readFileSync("./json-folder/fish-size.json"))
var questInfo = JSON.parse(fs.readFileSync("./json-folder/quest/quest-info.json"))
var questAvailable = JSON.parse(fs.readFileSync("./json-folder/quest/quest-available.json"))
var banniereInfo = JSON.parse(fs.readFileSync("./json-folder/banniere/banniere-data.json"))
var colorInfo = JSON.parse(fs.readFileSync("./json-folder/color/color-info.json"))

class Player{
	constructor(id){
		this.id = id
		this.money = 0
		this.tickets = 0
		this.banniere = "default"
	}
	async init(){
		var playerData = await playerList.find({"id":this.id}).toArray();
		if (playerData.length == 1){
			playerData = playerData[0]
			this.money = parseInt(playerData.money)
			if (playerData.tickets){
				this.tickets = playerData.tickets
			}
			if (playerData.banniere){
				this.banniere = playerData.banniere
			}
		}
	}
	async save(){
		var playerData = await playerList.find({"id":this.id}).toArray();
		var notSavePlayerData = {}
		for (var i in playerDataAvailable){
			notSavePlayerData[playerDataAvailable[i].name] = this[playerDataAvailable[i].name]
		}
		if (playerData.length == 1){
			await playerList.updateOne({"id":this.id},{"$set":notSavePlayerData})
		}else{
			await playerList.insertOne(notSavePlayerData)
		}
		return
	}
	async getInventory(){
		var fishPeche = await fishPecheList.find({"owner":this.id}).toArray()
		var userFish = []
		for (var i in fishPeche){
			//console.log(fishPeche[i])
			var thisFish = new Fish(fishPeche[i]._id)
			await thisFish.init(this)
			userFish.push(thisFish )
		}
		return userFish
	}
	async addFish(fish){
		var addFishData = {}
		addFishData.owner = this.id
		addFishData.fishId = fish.fishId
		addFishData.time = Date.now()
		var result = await fishPecheList.insertOne(addFishData)
		return result
	}
	async getInventoryString(ifNumber){
		var inv = await this.getInventory()
		var invTable = []
		for (var i in inv){
			if (invTable.find(object=> object.data.id == inv[i].data.id)){
				invTable.find(object=> object.data.id == inv[i].data.id).number ++
				invTable.find(object=> object.data.id == inv[i].data.id).tableData.push(inv[i])
			}else{
				invTable.push({"number":1,"data":inv[i].data,tableData:[inv[i]]})
			}
		}
		var stringToSend = ""
		for (var i in invTable){
			if (ifNumber){
				stringToSend+=(parseInt(i)+1)+". "
			}
			stringToSend+=invTable[i].data.emoji+" **"+invTable[i].data.name.fr+"** "+invTable[i].data.price+"🪙 x"+invTable[i].number+"\n"
		}
		if (stringToSend.length>=1900){
			stringToSend = ""
		for (var i in invTable){
			if (ifNumber){
				stringToSend+=(parseInt(i)+1)+". "
			}
			stringToSend+="**"+invTable[i].data.name.fr+"** "+invTable[i].data.price+"🪙 x"+invTable[i].number+"\n"
		}
		}
		return {"string":stringToSend,"table":invTable}
	}
	async getFishBibliotheque(){
		var finalBibliotheque = []
		var originalBibliotheque = []
		var originalBibliotheque = await bibliothequeFishList.find({owner:this.id}).toArray()
		for (var i in originalBibliotheque){
			var thisFish = new BibliothequeFish(originalBibliotheque[i]._id)
			await thisFish.init(this)
			finalBibliotheque[i] = thisFish
		}
		return finalBibliotheque
	}
	async getQuest(){
		var quests = await questList.find({"owner":this.id}).toArray()
		for (var i in quests){
			var thisQuest = new Quest(quests[i])
			quests[i] = thisQuest
			quests[i].owner = this
		}
		return quests
	}
	async addQuest(){
		var playerQuest = await this.getQuest()
		if (playerQuest.length <3){
				var randomQuest = questAvailable[Math.floor(Math.random()*questAvailable.length)]
				questList.insertOne({"owner":this.id,"questId":randomQuest})
			return true
		}
		return false
	}
	async getBanniere(){
		var bannieres = await banniereList.find({"owner":this.id}).toArray()
		for (var i in bannieres){
			bannieres[i].owner = this
			var thisBanniere = new Banniere(bannieres[i])
			bannieres[i] = thisBanniere
		}
		var defaultBanniere = new Banniere({owner:this,_id:"default"})
		console.log(defaultBanniere)
		bannieres.splice(0,0,defaultBanniere)
		return bannieres
	}
	async getBanniereString(ifNumber){
		var bannieres = await this.getBanniere()
		var bannieresTable = []
		console.log(bannieres)
		for (var i in bannieres){
			console.log(bannieres[i])
			if (bannieresTable.find(object=> object.data.banniereId == bannieres[i].banniereId && object.data.color == bannieres[i].color)){
				bannieresTable.find(object=> object.data.banniereId == bannieres[i].banniereId && object.data.color == bannieres[i].color).number ++
				bannieresTable.find(object=> object.data.banniereId == bannieres[i].banniereId && object.data.color == bannieres[i].color).tableData.push(bannieres[i])
			}else{
				bannieresTable.push({"number":1,"data":bannieres[i],tableData:[bannieres[i]]})
			}
		}
		var stringToSend = ""
		for (var i in bannieresTable){
			if (ifNumber){
				stringToSend+=(parseInt(i)+1)+". "
			}
			console.log(bannieresTable[i].data.data)
			stringToSend+="**"+bannieresTable[i].data.data.name.fr+"** "+colorInfo[bannieresTable[i].data.color].name+" x"+bannieresTable[i].number+"\n"
		}
		return {"string":stringToSend,"table":bannieresTable}
	}
}

class Banniere {
	constructor (data){
		this.id = data._id
		this.owner = data.owner
		if (this.id != "default"){
			this.banniereId = data.banniereId
			this.color = data.color
			this.data = banniereInfo[data.banniereId]
		}else{
			this.banniereId = "default"
			this.color = "black"
			this.data = banniereInfo.default
		}
	}
	async exist(){
		if (this.id == "default"){
			return true
		}
		var banniereExist = await banniereList.find({"_id":this.id}).toArray()
		if (banniereExist.length == 1){
			return true
		}else{
			return false
		}
	}
	async equip(){
		if (this.exist()){
			this.owner.banniere = this.id
			await this.owner.save()
			return true
		}
		return false
	}
	async sell(){
		if (this.id == "default"){
			return false
		}
		if (this.exist()){
			this.owner.money += parseInt(this.data.price)
			await this.owner.save()
			await this.destroy()
			return true
		}
		return false
	}
	async destroy(){
		if (this.id =="default"){
			return false
		}
		await banniereList.deleteOne({"_id":this.id})
		return true
	}
}

class Quest {
	constructor(data){
		this.id = data._id
		this.owner = data.owner
		this.questId = data.questId
		this.data = questInfo[data.questId]
	}
	async getAdvancement(){
		var playerInv = await this.owner.getInventory()
		if (this.data.type == "rarityToCollect"){
			var numberFound = 0
			for (var i in playerInv){
				if (playerInv[i].data && getFishRarity(playerInv[i].data.id).name == this.data.rarityToCollect){
					numberFound++
				}
			}
			return {"advancement":numberFound,"need":this.data.numberToCollect,"inventory":playerInv}
		}
	}
	async finish(){
		var list = await questList.find({"_id":this.id}).toArray()
		console.log(list)
		if (list.length == 1){
			var thisAdvancement = await this.getAdvancement()
			console.log(thisAdvancement)
			if (thisAdvancement.advancement>=thisAdvancement.need){
				console.log(this)
				if (this.data.type == "rarityToCollect"){
					var playerInv = thisAdvancement.inventory
					var numberEnleve = 0
					for (var i in playerInv){
						if (getFishRarity(playerInv[i].data.id).name == this.data.rarityToCollect){
							if (numberEnleve < thisAdvancement.need){
								numberEnleve++
								playerInv[i].destroy()
							}
						}
					}
					this.owner.tickets+=this.data.tickets
					this.owner.save()
					this.destroy()
					return true
				}
			}
		}
		return false
	}
	async destroy(){
		questList.deleteOne({"_id":this.id})
		
	}
}

class WaitingFish {
	constructor(id){
		this.id = id
	}
	async init(){
		var thisWaitingFish = await waitingFishList.find({"_id":this.id}).toArray()
		if (thisWaitingFish.length==1){
			thisWaitingFish = thisWaitingFish[0]
			this.guild = thisWaitingFish.guild
			this.cooldown = thisWaitingFish.cooldown
			this.fishId = thisWaitingFish.fishId
			this.message = thisWaitingFish.message
			this.channel = thisWaitingFish.channel
			this.fishData = await fishTable.find(fish=>fish.id == this.fishId)
		}
	}
	async available(){
		return this.cooldown+60000*2 > Date.now()
	}
	async destroy(){
		waitingFishList.deleteOne({"_id":this.id})
		if (client.channels.cache.has(this.channel)){
			var thisChannel = client.channels.cache.get(this.channel)
			var messageSent = await thisChannel.messages.fetch(this.message)
			if (messageSent){
				var thisEmbedTable = JSON.parse(JSON.stringify(embedTable.waitingFish.fish_gone))
				thisEmbedTable.description = thisEmbedTable.description.replace("<size>",fishSizeTable[this.fishData.size])
				messageSent.edit({embed:thisEmbedTable})
			}
		}
	}
	async verifyIfMessageExist(){
		if (client.channels.cache.has(this.channel)){
			var thisChannel = client.channels.cache.get(this.channel)
			var messageSent = await thisChannel.messages.fetch(this.message)
			if (messageSent){
				return messageSent
			}
			return false
		}
		return false
	}
	async peche(player){
		var thisWaitingFish = await waitingFishList.find({"_id":this.id}).toArray()
		//console.log(thisWaitingFish)
		if (thisWaitingFish.length == 1){
			//console.log("found2")
			await waitingFishList.deleteOne({"_id":this.id})
			var pecheMessage = await this.verifyIfMessageExist()
			//console.log(pecheMessage)
			if (pecheMessage){
				var firstEmbed = embedTable.pecheFish.launch
				firstEmbed.description = firstEmbed.description.replace("<user>",player.tag)
				await pecheMessage.edit({"embed":firstEmbed})
				await pecheMessage.react("🎣")
				await waitRandomTime(2000, 5000)
				await pecheMessage.edit({"embed":embedTable.pecheFish.fish_approach})
				var randomTime = Math.floor(Math.random()*3000)+2000
    		var timeNow = Date.now()
    		var alreadyTire = false
				async function changeMessage(){
					await waitRandomTime(randomTime,randomTime)
    			if (alreadyTire == false){
      			pecheMessage.edit({"embed":embedTable.pecheFish.fish_mord})
    			}
				}
				changeMessage()
				const filter = (reaction, user) => reaction.emoji.name === '🎣' && user.id === player.id
				await pecheMessage.awaitReactions(filter, {max:1,time:randomTime+2000})
				alreadyTire = true
				if (Date.now()>randomTime + timeNow){
        	if (Date.now()<randomTime + timeNow+2000){
						var alreadyFound = await bibliothequeFishList.find({fishId:this.fishId,owner:player.id}).toArray()
						if (alreadyFound.length == 0){
							await bibliothequeFishList.insertOne({"owner":player.id,"fishId":this.fishId,"time":Date.now()})
						}
						var thisPlayer = new Player(player.id)
						await thisPlayer.init()
						var questAdded = await thisPlayer.addQuest()
						var questText = ""
						if (questAdded){
							questText = "🎟️ Une nouvelle quête est maintenant dsponible (f!quest)\n\n"
						}
						var messageEmbed = JSON.parse(JSON.stringify(embedTable.pecheFish.fish_caught))
						messageEmbed.description = messageEmbed.description.replace("<user>","<@"+player.id+">")
						messageEmbed.description = messageEmbed.description.replace("<fishName>",this.fishData.name.fr)
						messageEmbed.description = messageEmbed.description.replace("<fishQuality>",getFishRarity(this.fishData.id).name)
						messageEmbed.description = messageEmbed.description.replace("<fishPrice>",this.fishData.price)
						messageEmbed.description = messageEmbed.description.replace("<caughtText>",this.fishData.caughtText)
						messageEmbed.description = messageEmbed.description.replace("<questText>",questText)
						messageEmbed.thumbnail.url = this.fishData.image
						pecheMessage.edit({"embed":messageEmbed})
						thisPlayer.addFish(this)
					}else{
						pecheMessage.edit({"embed":embedTable.pecheFish.too_late})
					}
				}else{
						pecheMessage.edit({"embed":embedTable.pecheFish.too_fast})
				}
			}
		}
	}
}
class Server {
	constructor(id){
		this.id = id
		this.fishChannel = ""
		this.fishCooldown = 0
		this.currentFishWaiting = []
	}
	async init(){
		var serverData = await serverList.find({"id":this.id}).toArray();	
		//console.log(serverData)
		if (serverData.length == 1){
			serverData = serverData[0]
			this.fishChannel = serverData.fishChannel
			this.fishCooldown = 0
			if (guildCooldown[this.id]){
				this.fishCooldown = guildCooldown
			}
			this.currentFishWaiting = await waitingFishList.find({"guild":this.id}).toArray();
		}
	}
	async save(){
		var serverData = await serverList.find({"id":this.id}).toArray();
		//console.log(serverData)
		var notSaveServerData = {}
		notSaveServerData.fishChannel = this.fishChannel
		notSaveServerData.fishCooldown = this.fishCooldown
		notSaveServerData.id = this.id
		if (serverData.length == 1){
			return await serverList.updateOne({"id":this.id},{"$set":notSaveServerData})
		}else{
			return await serverList.insertOne(notSaveServerData)
		}
		return
	}
	async addFish(){
		if (this.fishChannel && client.channels.cache.get(this.fishChannel)){
			guildCooldown[this.id] = Date.now()
			var randomFish = getRandomFish()
			console.log(randomFish)
			var thisEmbed = JSON.parse(JSON.stringify(embedTable.waitingFish.in_water))
			thisEmbed.description = thisEmbed.description.replace("<size>",fishSizeTable[randomFish.size])
			var preEmbed = JSON.parse(JSON.stringify(embedTable.waitingFish.pre_peche))
			var messageSent = await client.channels.cache.get(this.fishChannel).send({"embed":thisEmbed})
			var fishWaiting = {"fishId":randomFish.id,"message":messageSent.id,"guild":this.id,"cooldown":Date.now(),"channel":messageSent.channel.id}
			var fishAdd = await waitingFishList.insertOne(fishWaiting)
			//await messageSent.edit({"embed":thisEmbed})
			await messageSent.react("🐟")
			return {"success":true}
		}
	}
}
class Fish{
	constructor(id){
		this.id = id
	}
	async init(owner){
		var thisFish = await fishPecheList.find({"_id":this.id}).toArray();
		if (thisFish.length == 1){
			//console.log(thisFish[0])
			thisFish = thisFish[0]
			if (owner){
				this.owner = owner
			}else{
				var fishOwner = new Player(thisFish.owner)
				this.owner = await fishOwner.init()
			}
			this.fishId = thisFish.fishId
			//console.log(thisFish)
			var thisFishData = fishTable.find(fish=>fish.id == this.fishId)
			//console.log(thisFishData)
			this.id = thisFish._id
			this.data = thisFishData
			return
		}
	}
	async sell(){
		var thisFish = await fishPecheList.find({"_id":this.id}).toArray();
		if (thisFish.length == 1){
			this.owner.money += parseInt(this.data.price)
			await this.owner.save()
			await this.destroy()
			return {"success":true}
		}
		return {"success":false}
	}
	async destroy(){
		var thisFish = await fishPecheList.find({"_id":this.id}).toArray();
		if (thisFish.length == 1){
			fishPecheList.deleteOne({"_id":this.id})
		}
		return
	}
}

class BibliothequeFish{
	constructor(id){
		this.id = id
	}
	async init(owner){
		var thisFish = await bibliothequeFishList.find({"_id":this.id}).toArray();
		if (thisFish.length == 1){
			//console.log(thisFish[0])
			thisFish = thisFish[0]
			//console.log(thisFish.owner)
			if (owner){
				this.owner = owner
			}else{
				var fishOwner = new Player(thisFish.owner)
				this.owner = await fishOwner.init()
			}
			this.fishId = thisFish.fishId
			//console.log(thisFish)
			var thisFishData = fishTable.find(fish=>fish.id == this.fishId)
			//console.log(thisFishData)
			this.id = thisFish._id
			this.data = thisFishData
			return
		}
	}
}

module.exports = {
	guildCooldown : function(){
		return guildCooldown	
	},
	ClassInit : function(c,fT,pL,fPL,wFL,sL,bFL,qL,bL){
		guildCooldown = {"test":1}
		client = c
		fishTable = fT
		playerList = pL
		fishPecheList = fPL
		serverList = sL
		waitingFishList = wFL
		bibliothequeFishList = bFL
		questList = qL
		banniereList = bL
		functionsInit(fT)
	},
	BibliothequeFish : BibliothequeFish,
	Fish : Fish,

Player : Player,

Server : Server,

WaitingFish : WaitingFish
}
