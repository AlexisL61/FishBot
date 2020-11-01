const Discord = require("discord.js");
const {Intents} = require("discord.js")
const fs = require("fs");
const axios = require("axios");
const { registerFont } = require('canvas');
var fishSizeTable = JSON.parse(fs.readFileSync("./json-folder/fish-size.json"))
registerFont('./Roboto-Bold.ttf', { family: 'Roboto' });
var {Fish,Server,Player,WaitingFish,BibliothequeFish,ClassInit,guildCooldown} = require("./class.js")
var {generateAquarium,canvasInit,generateBibliotheque,generateProfil} = require("./canvas.js")

var embedTable = JSON.parse(fs.readFileSync("./embeds.json"))
const client = new Discord.Client({ partials: ['MESSAGE', 'REACTION'], ws: { intents: Intents.ALL }  });
var fishTable,playerList,fishPecheList,serverList,waitingFishList,bibliothequeFishList,questList

var messageReact = {}
client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message: ', error);
			return;
		}
	}
	if (reaction.emoji.name == "🐟" && !user.bot && !
		messageReact[reaction.message.id]){
		//console.log("react")
		messageReact[reaction.message.id] = true
		var messageFound = await waitingFishList.find({"message":reaction.message.id}).toArray()
		if (messageFound.length == 1 && reaction.users.cache.array().length == 2){
			user = reaction.users.cache.last()
			var thisWaitingFish = new WaitingFish(messageFound[0]._id)
			await thisWaitingFish.init()
			//console.log(thisWaitingFish)
			thisWaitingFish.peche(user)
		}
	}
})

client.on("ready",async function(){
	//Récupération des données
	//console.log("READY")
	 client.user.setActivity("un jour je serai le meilleur pécheur")
   canvasInit(client)
	fishTable = fs.readFileSync("./json-folder/fish-table.json")
	playerList = mclient.db("MainDatabase").collection("Players");
	fishPecheList = mclient.db("MainDatabase").collection("FishPeche");
	waitingFishList = mclient.db("MainDatabase").collection("FishWaiting");
	serverList = mclient.db("MainDatabase").collection("Servers");
	bibliothequeFishList = mclient.db("MainDatabase").collection("Bibliotheque");
	questList = mclient.db("MainDatabase").collection("Quest");
	////console.log(fishList.find({"owner":this.id}).toArray())
	//console.log(JSON.stringify(fishTable))
	ClassInit(client,fishTable,playerList,fishPecheList,waitingFishList,serverList,bibliothequeFishList,questList)

	
	setInterval(async function(){
		var fishToErase = await waitingFishList.find({}).toArray()
		for (var i in fishToErase){
			if (fishToErase[i].cooldown + 2*60000<Date.now()){
				var thisFishToErase = new WaitingFish(fishToErase[i]._id)
				thisFishToErase.init()
				.then(function(){
					thisFishToErase.destroy()
				})
			}
		}
	},5000)
})

client.on("message",async function(message){
	//Nouveau message
	if (message.author.bot) return
	//Vérification du cooldown
	if (!guildCooldown()[message.guild.id] || (guildCooldown()[message.guild.id])+60000*10<Date.now()){
		//Ajout du poisson
		var thisServer = new Server(message.guild.id)
		await thisServer.init()
		var fishAdded = await thisServer.addFish()
	}
	if (message.content.startsWith("f!quest")){
		var messageSent = await message.channel.send({embed:embedTable.quest.loading})
		var thisPlayer =new Player(message.author.id)
		await thisPlayer.init()
		var questAvailable = await thisPlayer.getQuest()
		var thisEmbed = JSON.parse(JSON.stringify(embedTable.quest.loaded))
		var questDone = 0
		for (var i=0;i<3;i++){
			if (questAvailable[i]){
				var questAdvancement =await questAvailable[i].getAdvancement()
				thisEmbed.fields.push({"name":questAvailable[i].data.title,"value":questAvailable[i].data.description + " ("+questAdvancement.advancement+"/"+questAvailable[i].data.numberToCollect+")\nRécompense: **x"+questAvailable[i].data.tickets+"🎟️**"})
				if (questAdvancement.advancement >= questAdvancement.need){
					thisEmbed.fields[i].value = "✅ "+thisEmbed.fields[i].value
					questDone ++
				}
			}else{
				thisEmbed.fields.push({"name":"Quête vide","value":"Péchez un poisson pour avoir une nouvelle quète!"})
			}
		}
		await messageSent.edit({"embed":thisEmbed})
		if (questDone != 0){
			await messageSent.react("✅")
			const filterR = (r,u)=>r.emoji.name == "✅" && u.id == message.author.id
			var reaction = await messageSent.awaitReactions(filterR,{"max":1})
			reaction = reaction.first()
			var totalTicketGot = 0
			for (var i in questAvailable){
				var isFinish = await questAvailable[i].finish()
				if (isFinish){
					totalTicketGot+=questAvailable[i].data.tickets
				}
			}
			if (totalTicketGot != 0){
				var reactEmbed = JSON.parse(JSON.stringify(embedTable.quest.finish))
				reactEmbed.description = reactEmbed.description.replace("<tickets>",totalTicketGot)
				message.channel.send({"embed":reactEmbed})
			}else{
				message.channel.send({"embed":embedTable.quest.error})
			}
		}
	}
	if (message.content.startsWith("f!profil")){
		var messageSent = await message.channel.send({embed:embedTable.profil.loading})
		var thisPlayer =new Player(message.author.id)
		await thisPlayer.init()
		var thisEmbed = JSON.parse(JSON.stringify(embedTable.profil.loaded))
		var profilImage = await generateProfil(thisPlayer,message.author)
		thisEmbed.image = {"url":profilImage}
		messageSent.edit({embed:thisEmbed})
	}
	if (message.content.startsWith("f!aquarium")){
		var messageSent = await message.channel.send({embed:embedTable.aquarium.loading})
		var thisPlayer =new Player(message.author.id)
		await thisPlayer.init()
		var playerInventory = await thisPlayer.getInventory()
		//console.log(playerInventory)
		var thisEmbed = JSON.parse(JSON.stringify(embedTable.aquarium.loaded))
		var embedDesc = "Votre aquarium: \n\n"+(await thisPlayer.getInventoryString()).string
		thisEmbed.description = embedDesc
		var aquaImage =await generateAquarium(playerInventory)
		thisEmbed.image = {"url":aquaImage}
		messageSent.edit({embed:thisEmbed})
		await messageSent.react("🪙")
		const filter = (r,u)=>u.id == message.author.id && r.emoji.name == "🪙"
		var reaction = await messageSent.awaitReactions(filter,{"max":1})
		var inventoryWithNum = await thisPlayer.getInventoryString(true)
		var thisEmbed = JSON.parse(JSON.stringify(embedTable.sellFish.main_embed))
		thisEmbed.description = "Envoyez dans votre prochain message le nombre correspondant au poisson pour le vendre\n\n"+inventoryWithNum.string
		await messageSent.edit({"embed":thisEmbed})
		const filterM = (m)=>m.author.id == message.author.id
		var messages = await messageSent.channel.awaitMessages(filterM,{"max":1})
		var thisMessage = messages.first()
		var numbers = thisMessage.content.split(",")
		var fishSold = []
		var coinsGet = 0
		for (var i in numbers){
			//console.log("111111111111111111")
			if (parseInt(numbers[i]) && inventoryWithNum.table[parseInt(numbers[i])-1]){
				//console.log("222222222222222222222222222")
				var thisFish = inventoryWithNum.table[parseInt(numbers[i])-1]
				if (thisFish.tableData[0]){
					//console.log("333333333333333333")
					await thisFish.tableData[0].sell()
					fishSold.push(thisFish.data)
					coinsGet+=parseInt(thisFish.data.price)
					thisFish.tableData.splice(0,1)
				}
			}
		}
		var fishSoldString = ""
		for (var i in fishSold){
			fishSoldString+=fishSold[i].name.fr
			if (i+1 == fishSold.length){
				fishSoldString+="."
			}else{
				fishSoldString+=", "
			}
		}
		var successSold = JSON.parse(JSON.stringify(embedTable.sellFish.success))
		successSold.description = successSold.description.replace("<fishSold>",fishSoldString).replace("<moneyGot>",coinsGet)
		message.channel.send({"embed":successSold})
	}
	if (message.content.startsWith("update-fish")){
		/*var newFishTable =[{"_id":"5f9317cbc0bd95022140cc26","name":{"en":"Bitterling","fr":"Bouvière"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/e/ea/NH-Icon-bitterling.png/revision/latest?cb=20200401003128","price":"900","location":"River","size":"1","id":"bitterling","emoji":"<:bitterling:770700435371720785>","caughtText":" \"Tu as pris une bouvière! C’est pas la femelle du bouvier?\"\n"},{"_id":"5f9317cbc0bd95022140cc27","name":{"en":"Pale chub","fr":"Chevaine"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/2c/NH-Icon-palechub.png/revision/latest?cb=20200401003129","price":"200","location":"River","size":"1","id":"pale_chub","emoji":"<:pale_chub:770700436780220448>","caughtText":" \"Tu as pris un chevaine! Il irait bien sur mon chevet!\"\n"},{"_id":"5f9317cbc0bd95022140cc28","name":{"en":"Crucian carp","fr":"Carassin"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/0/03/NH-Icon-cruciancarp.png/revision/latest?cb=20200401003129","price":"160","location":"River","size":"2","id":"crucian_carp","emoji":"<:crucian_carp:770700438461874186>","caughtText":" \"Tu as pris un carassin! Tu sais que c'est un cousin de la carpe?\"\n"},{"_id":"5f9317cbc0bd95022140cc29","name":{"en":"Dace","fr":"Vandoise"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/22/NH-Icon-dace.png/revision/latest?cb=20200401003129","price":"240","location":"River","size":"3","id":"dace","emoji":"<:dace:770700439795925021>","caughtText":" \"Tu as pris une vandoise! Tu crois qu’elle aime les framboises?\"\n"},{"_id":"5f9317cbc0bd95022140cc2a","name":{"en":"Carp","fr":"Carpe"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/2c/NH-Icon-carp.png/revision/latest?cb=20200401003129","price":"300","location":"Pond","size":"4","id":"carp","emoji":"<:carp:770700441168248933>","caughtText":" \"Tu as pris une carpe! Elle ne te dira pas grand-chose!\"\n"},{"_id":"5f9317cbc0bd95022140cc2b","name":{"en":"Koi","fr":"Carpe koï"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/74/NH-Icon-koi.png/revision/latest?cb=20200401003129","price":"4000","location":"Pond","size":"4","id":"koi","emoji":"<:koi:770700442416971796>","caughtText":" \"Tu as pris un carpe koï! Ça reste une carpe... quoi.\"\n"},{"_id":"5f9317cbc0bd95022140cc2c","name":{"en":"Goldfish","fr":"Poisson rouge"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/e/ed/NH-Icon-goldfish.png/revision/latest?cb=20200401003129","price":"1300","location":"Pond","size":"1","id":"goldfish","emoji":"<:goldfish:770701628025995314>","caughtText":" \"Tu as pris un poisson rouge! Pourtant, les petits pois sont verts!\"\n"},{"_id":"5f9317cbc0bd95022140cc2d","name":{"en":"Pop-eyed goldfish","fr":"Cyprin doré"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/c/c9/NH-Icon-popeyedgoldfish.png/revision/latest?cb=20200401003129","price":"1300","location":"Pond","size":"1","id":"pop-eyed_goldfish","emoji":"<:popeyed_goldfish:770701629057269812>","caughtText":" \"Tu as pris un cyprin doré! Tu as vu ses grands yeux?\"\n"},{"_id":"5f9317cbc0bd95022140cc2e","name":{"en":"Ranchu goldfish","fr":"Ranchu"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/f/f9/NH-Icon-ranchugoldfish.png/revision/latest?cb=20200401003129","price":"4500","location":"Pond","size":"2","id":"ranchu_goldfish","emoji":"<:ranchu_goldfish:770701631255347200>","caughtText":" \"Tu as pris un ranchu! Comme les autres petits pois, celui-ci est également rouge.\"\n"},{"_id":"5f9317cbc0bd95022140cc2f","name":{"en":"Killifish","fr":"Fondule barré"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/c/c3/NH-Icon-killifish.png/revision/latest?cb=20200401003129","price":"300","location":"Pond","size":"1","id":"killifish","emoji":"<:killifish:770701632068386848>","caughtText":" \"Tu as pris un fondule barré! Ça fait un de moins sur la liste!\"\n"},{"_id":"5f9317cbc0bd95022140cc30","name":{"en":"Crawfish","fr":"Écrevisse"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/c/cd/NH-Icon-crawfish.png/revision/latest?cb=20200401003129","price":"200","location":"Pond","size":"2","id":"crawfish","emoji":"<:crawfish:770701633650163742>","caughtText":" <i>A compléter</i>\n"},{"_id":"5f9317cbc0bd95022140cc31","name":{"en":"Soft-shelled turtle","fr":"Tortue trionyx"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/c/c3/NH-Icon-softshelledturtle.png/revision/latest?cb=20200401003129","price":"3750","location":"River","size":"4","id":"soft-shelled_turtle","emoji":"<:softshelled_turtle:770701634946465832>","caughtText":" \"Bien joué! Tu as attrapé une tortue trionyx! Attention, elle n'est pas commode!\"; \"Il existe aussi des lièvres trionyx?\"\n"},{"_id":"5f9317cbc0bd95022140cc32","name":{"en":"Snapping Turtle","fr":"Tortue serpentine"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/24/NH-Icon-snappingturtle.png/revision/latest?cb=20200401003129","price":"5000","location":"River","size":"4","id":"snapping_turtle","emoji":"<:snapping_turtle:770701636191780884>","caughtText":" \"Tu as pris une tortue serpentine! Ou est-ce un serpent tortueux?\"\n"},{"_id":"5f9317cbc0bd95022140cc33","name":{"en":"Tadpole","fr":"Têtard"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/1c/NH-Icon-tadpole.png/revision/latest?cb=20200401003129","price":"100","location":"Pond","size":"1","id":"tadpole","emoji":"<:tadpole:770701637034442774>","caughtText":" Tu as pris un têtard! C'est pas trop tôt!\"\n"},{"_id":"5f9317cbc0bd95022140cc34","name":{"en":"Frog","fr":"Grenouille"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/6/6b/NH-Icon-frog.png/revision/latest?cb=20200401003129","price":"120","location":"Pond","size":"2","id":"frog","emoji":"<:frog:770701638721339432>","caughtText":" \"Tu as pris une grenouille! J'y croâ pas!\"\n"},{"_id":"5f9317cbc0bd95022140cc35","name":{"en":"Freshwater goby","fr":"Gobie d'eau douce"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/e/ee/NH-Icon-freshwatergoby.png/revision/latest?cb=20200401003129","price":"400","location":"River","size":"2","id":"freshwater_goby","emoji":"<:freshwater_goby:770701639938080838>","caughtText":" \"Tu as pris un gobie d’eau douce! Go, go! Le gobie!\"\n"},{"_id":"5f9317cbc0bd95022140cc36","name":{"en":"Loach","fr":"Loche d'étang"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/77/NH-Icon-loach.png/revision/latest?cb=20200401003129","price":"400","location":"River","size":"2","id":"loach","emoji":"<:loach:770701640692400149>","caughtText":"Tu as pris une loche d'étang ! Tu savais que la loche détend ?"},{"_id":"5f9317cbc0bd95022140cc37","name":{"en":"Catfish","fr":"Silure"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/29/NH-Icon-catfish.png/revision/latest?cb=20200401003129","price":"800","location":"Pond","size":"4","id":"catfish","emoji":"<:catfish:770701642332766209>","caughtText":" \"Tu as pris un silure! J'en suis pas si sûr..\"\n"},{"_id":"5f9317cbc0bd95022140cc38","name":{"en":"Giant snakehead","fr":"Tête-de-serpent"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/0/0c/NH-Icon-giantsnakehead.png/revision/latest?cb=20200401003129","price":"5500","location":"Pond","size":"4","id":"giant_snakehead","emoji":"<:giant_snakehead:770701643229429801>","caughtText":" \"Tu as pris un tête-de-serpent! Et son corps, alors?!\"\n"},{"_id":"5f9317cbc0bd95022140cc39","name":{"en":"Bluegill","fr":"Crapet"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/6/69/NH-Icon-bluegill.png/revision/latest?cb=20200401003129","price":"180","location":"River","size":"2","id":"bluegill","emoji":"<:bluegill:770701644802293770>","caughtText":" \"Tu as pris un crapet! Tu l'as bien attrapé!\"\n"},{"_id":"5f9317cbc0bd95022140cc3a","name":{"en":"Yellow perch","fr":"Perche jaune"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/1d/NH-Icon-yellowperch.png/revision/latest?cb=20200401003129","price":"300","location":"River","size":"3","id":"yellow_perch","emoji":"<:yellow_perch:770701645985611796>","caughtText":" \"Tu as pris une perche jaune! L'opération perche jaune a été un succès!\"\n"},{"_id":"5f9317cbc0bd95022140cc3b","name":{"en":"Black bass","fr":"Bar"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/e/e2/NH-Icon-blackbass.png/revision/latest?cb=20200401003129","price":"400","location":"River","size":"4","id":"black_bass","emoji":"<:black_bass:770701647236038677>","caughtText":" \"Tu as pris un bar! Sur un bateau, le bar barre!\"\n"},{"_id":"5f9317cbc0bd95022140cc3c","name":{"en":"Tilapia","fr":"Tilapia"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/5/53/NH-Icon-tilapia.png/revision/latest?cb=20200401003129","price":"800","location":"River","size":"3","id":"tilapia","emoji":"<:tilapia:770701648527491102>","caughtText":" \"Tu as pris un tilapia! Il habite dans un ticlapier!\"\n"},{"_id":"5f9317cbc0bd95022140cc3d","name":{"en":"Pike","fr":"Brochet"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/d/dc/NH-Icon-pike.png/revision/latest?cb=20200401003130","price":"1800","location":"River","size":"5","id":"pike","emoji":"<:pike:770701649856823356>","caughtText":"Tu as pris un brochet ! Il se cachait derrière un rocher ?"},{"_id":"5f9317cbc0bd95022140cc3e","name":{"en":"Pond smelt","fr":"Éperlan"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/4/41/NH-Icon-pondsmelt.png/revision/latest?cb=20200401003130","price":"500","location":"River","size":"2","id":"pond_smelt","emoji":"<:pond_smelt:770701651266764860>","caughtText":" \"Tu as pris un éperlan! Il n'était pas dans un bon jour!\"\n"},{"_id":"5f9317cbc0bd95022140cc3f","name":{"en":"Sweetfish","fr":"Ayu"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/4/40/NH-Icon-sweetfish.png/revision/latest?cb=20200401003129","price":"900","location":"River","size":"3","id":"sweetfish","emoji":"<:sweetfish:770701652444839967>","caughtText":" \"Tu as pris un ayu! Une pensée pour mes parents et mes ayus!\"\n"},{"_id":"5f9317cbc0bd95022140cc40","name":{"en":"Cherry salmon","fr":"Saumon masou"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/5/5f/NH-Icon-cherrysalmon.png/revision/latest?cb=20200401003129","price":"1000","location":"River (Clifftop)","size":"3","id":"cherry_salmon","emoji":"<:cherry_salmon:770701653904982036>","caughtText":" \"Tu as pris un saumon masou! Je crois avoir vu un saumon quelque part, masou?\"\n"},{"_id":"5f9317cbc0bd95022140cc41","name":{"en":"Char","fr":"Omble"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/15/NH-Icon-char.png/revision/latest?cb=20200401003129","price":"3800","location":"River (Clifftop)  Pond","size":"3","id":"char","emoji":"<:char:770701654730997771>","caughtText":"Tu as pris un omble ! Pourtant, aucun omble au tableau !"},{"_id":"5f9317cbc0bd95022140cc42","name":{"en":"Golden trout","fr":"Truite dorée"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/5/5c/NH-Icon-goldentrout.png/revision/latest?cb=20200401003129","price":"15000","location":"River (Clifftop)","size":"3","id":"golden_trout","emoji":"<:golden_trout:770701656198873118>","caughtText":" \"Tu as pris une truite dorée! Sa couleur ne laisse aucun doute.\"\n"},{"_id":"5f9317cbc0bd95022140cc43","name":{"en":"Stringfish","fr":"Dai yu"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/7b/NH-Icon-stringfish.png/revision/latest?cb=20200401003129","price":"15000","location":"River (Clifftop)","size":"5","id":"stringfish","emoji":"<:stringfish:770701657574473788>","caughtText":" \"Tu as pris un dai yu! J'en avais pas vu depuis dai yustres!\"\n"},{"_id":"5f9317cbc0bd95022140cc44","name":{"en":"Salmon","fr":"Saumon"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/f/fb/NH-Icon-salmon.png/revision/latest?cb=20200401003129","price":"700","location":"River (Mouth)","size":"4","id":"salmon","emoji":"<:salmon:770701658819919962>","caughtText":" \"Tu as pris un saumon! C'est mieux qu'un sermon!\"\n"},{"_id":"5f9317cbc0bd95022140cc45","name":{"en":"King salmon","fr":"Saumon roi"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/f/fd/NH-Icon-kingsalmon.png/revision/latest?cb=20200401003129","price":"1800","location":"River (Mouth)","size":"5","id":"king_salmon","emoji":"<:king_salmon:770701660141912104>","caughtText":" \"Waouh! Bravo! Tu as pris un saumon roi! Échec et mat!\"\n"},{"_id":"5f9317cbc0bd95022140cc46","name":{"en":"Mitten crab","fr":"Crabe chinois"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/e/e3/NH-Icon-mittencrab.png/revision/latest?cb=20200401003129","price":"2000","location":"River","size":"2","id":"mitten_crab","emoji":"<:mitten_crab:770701661383426068>","caughtText":" \"Tu as pris un crabe chinois! C'est le plus asiatique des crustacés!\"\n"},{"_id":"5f9317cbc0bd95022140cc47","name":{"en":"Guppy","fr":"Guppy"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/6/63/NH-Icon-guppy.png/revision/latest?cb=20200401003129","price":"1300","location":"River","size":"1","id":"guppy","emoji":"<:guppy:770701662699388928>","caughtText":" \"Tu as pris un guppy! Il plairait à mon papy!\"\n"},{"_id":"5f9317cbc0bd95022140cc48","name":{"en":"Nibble fish","fr":"Poisson docteur"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/8/89/NH-Icon-nibblefish.png/revision/latest?cb=20200401003129","price":"1500","location":"River","size":"1","id":"nibble_fish","emoji":"<:nibble_fish:770701664067518464>","caughtText":" \"Tu as pris un poisson docteur! Mets-le dans un aquarium hôpital!\"\n"},{"_id":"5f9317cbc0bd95022140cc49","name":{"en":"Angelfish","fr":"Poisson-ange"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/6/63/NH-Icon-angelfish.png/revision/latest?cb=20200401003128","price":"3000","location":"River","size":"2","id":"angelfish","emoji":"<:angelfish:770701665350713416>","caughtText":" \"Tu as pris un poisson-ange! C'est l'ennemi du poisson-démon!\"\n"},{"_id":"5f9317cbc0bd95022140cc4a","name":{"en":"Betta","fr":"Combattant"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/7c/NH-Icon-betta.png/revision/latest?cb=20200401003129","price":"2500","location":"River","size":"2","id":"betta","emoji":"<:betta:770701666860531723>","caughtText":"Tu as pris un combattant ! Il cherche la bagarre ?"},{"_id":"5f9317cbc0bd95022140cc4b","name":{"en":"Neon tetra","fr":"Néon bleu"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/d/da/NH-Icon-neontetra.png/revision/latest?cb=20200401003129","price":"500","location":"River","size":"1","id":"neon_tetra","emoji":"<:neon_tetra:770701668420550677>","caughtText":" \"Tu as pris un néon bleu! Tu n'auras plus jamais peur du noir!\"\n"},{"_id":"5f9317cbc0bd95022140cc4c","name":{"en":"Rainbowfish","fr":"Poisson arc-en-ciel"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/6/68/NH-Icon-rainbowfish.png/revision/latest?cb=20200401003129","price":"800","location":"River","size":"1","id":"rainbowfish","emoji":"<:rainbowfish:770701669256134677>","caughtText":" \"Tu as pris un poisson arc-en-ciel! Où est mon poisson marmite-pleine-d'or?\"\n"},{"_id":"5f9317cbc0bd95022140cc4d","name":{"en":"Piranha","fr":"Piranha"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/b/b9/NH-Icon-piranha.png/revision/latest?cb=20200401003130","price":"2500","location":"River","size":"2","id":"piranha","emoji":"<:piranha:770701670736461834>","caughtText":" <i>À compléter</i>\n"},{"_id":"5f9317cbc0bd95022140cc4e","name":{"en":"Arowana","fr":"Arowana"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/b/bf/NH-Icon-arowana.png/revision/latest?cb=20200401003128","price":"10000","location":"River","size":"4","id":"arowana","emoji":"<:arowana:770701671827111957>","caughtText":"Tu as pris un arowana ! Tant mieux pour toi !"},{"_id":"5f9317cbc0bd95022140cc4f","name":{"en":"Dorado","fr":"Dorade"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/d/df/NH-Icon-dorado.png/revision/latest?cb=20200401003129","price":"15000","location":"River","size":"5","id":"dorado","emoji":"<:dorado:770701673026551829>","caughtText":" \"Tu as pris un dorado! En grandissant, il deviendra un doradulte!\"\n"},{"_id":"5f9317cbc0bd95022140cc50","name":{"en":"Gar","fr":"Gar"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/9/9f/NH-Icon-gar.png/revision/latest?cb=20200401003129","price":"6000","location":"Pond","size":"5","id":"gar","emoji":"<:gar:770701674456285205>","caughtText":" \"Tu as pris un gar! Il est venu sans même crier « gar! »\n"},{"_id":"5f9317cbc0bd95022140cc51","name":{"en":"Arapaima","fr":"Arapaïma"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/7f/NH-Icon-arapaima.png/revision/latest?cb=20200401003128","price":"10000","location":"River","size":"6","id":"arapaima","emoji":"<:arapaima:770701690172604466>","caughtText":" \"Tu as pris un arapaïma! T'as vu la taille de ce truc?!\"\n"},{"_id":"5f9317cbc0bd95022140cc52","name":{"en":"Saddled bichir","fr":"Bichir"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/a/a0/NH-Icon-saddledbichir.png/revision/latest?cb=20200401003130","price":"4000","location":"River","size":"4","id":"saddled_bichir","emoji":"<:saddled_bichir:770704240595304450>","caughtText":" \"Tu as pris un bichir! C'est un beau spécimen!\"\n"},{"_id":"5f9317cbc0bd95022140cc53","name":{"en":"Sturgeon","fr":"Esturgeon"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/9/98/NH-Icon-sturgeon.png/revision/latest?cb=20200401003129","price":"10000","location":"River (Mouth)","size":"6","id":"sturgeon","emoji":"<:sturgeon:770704242750390303>","caughtText":"Tu as pris un esturgeon ! On l'appelle la poule d'eau aux œufs d'or !"},{"_id":"5f9317cbc0bd95022140cc54","name":{"en":"Sea butterfly","fr":"Clione"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/8/8f/NH-Icon-seabutterfly.png/revision/latest?cb=20200401003129","price":"1000","location":"Sea","size":"1","id":"sea_butterfly","emoji":"<:sea_butterfly:770704244328235069>","caughtText":" \"Tu as pris une clione! C'est la femelle du clion!\"\n"},{"_id":"5f9317cbc0bd95022140cc55","name":{"en":"Sea horse","fr":"Hippocampe"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/5/55/NH-Icon-seahorse.png/revision/latest?cb=20200401003129","price":"1100","location":"Sea","size":"1","id":"sea_horse","emoji":"<:sea_horse:770704245493989396>","caughtText":" \"Tu as pris un hippocampe! À dada sur mon poisson!\"\n"},{"_id":"5f9317cbc0bd95022140cc56","name":{"en":"Clown fish","fr":"Poisson-clown"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/2f/NH-Icon-clownfish.png/revision/latest?cb=20200401003129","price":"650","location":"Sea","size":"1","id":"clown_fish","emoji":"<:clown_fish:770704246902620180>","caughtText":" \"Tu as pris un poisson-clown! Qu'est-ce qu'on se marre, dans la mer!\"\n"},{"_id":"5f9317cbc0bd95022140cc57","name":{"en":"Surgeonfish","fr":"Poisson chirurgien"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/11/NH-Icon-surgeonfish.png/revision/latest?cb=20200401003129","price":"1000","location":"Sea","size":"2","id":"surgeonfish","emoji":"<:surgeonfish:770704248434065448>","caughtText":" \"Tu as pris un poisson chirurgien! C'était un combat aux forceps!\"\n"},{"_id":"5f9317cbc0bd95022140cc58","name":{"en":"Butterfly fish","fr":"Poisson-papillon"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/8/8e/NH-Icon-butterflyfish.png/revision/latest?cb=20200401003129","price":"1000","location":"Sea","size":"2","id":"butterfly_fish","emoji":"<:butterfly_fish:770704250678149160>","caughtText":" \"Tu as pris un poisson-papillon! Avant, c'était un poisson-chenille?\"\n"},{"_id":"5f9317cbc0bd95022140cc59","name":{"en":"Napoleonfish","fr":"Napoléon"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/6/6f/NH-Icon-napoleonfish.png/revision/latest?cb=20200401003129","price":"10000","location":"Sea","size":"6","id":"napoleonfish","emoji":"<:napoleonfish:770704253231562772>","caughtText":"Tu as pris un Napoléon ! L'empereur de tous les poissons !"},{"_id":"5f9317cbc0bd95022140cc5a","name":{"en":"Zebra turkeyfish","fr":"Poisson scorpion"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/1c/NH-Icon-zebraturkeyfish.png/revision/latest?cb=20200401003130","price":"500","location":"Sea","size":"3","id":"zebra_turkeyfish","emoji":"<:zebra_turkeyfish:770704254645043210>","caughtText":"Tu as pris un poisson-scorpion ! Il n'y a pas que sa queue qui pique !"},{"_id":"5f9317cbc0bd95022140cc5b","name":{"en":"Blowfish","fr":"Poisson-ballon"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/3/39/NH-Icon-blowfish.png/revision/latest?cb=20200401003129","price":"5000","location":"Sea","size":"3","id":"blowfish","emoji":"<:blowfish:770704256231014400>","caughtText":" \"Tu as pris un poisson-ballon! Voilà le meilleur ami des poissons sportifs!\"\n"},{"_id":"5f9317cbc0bd95022140cc5c","name":{"en":"Puffer fish","fr":"Poisson-porc-épic"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/1f/NH-Icon-pufferfish.png/revision/latest?cb=20200401003130","price":"250","location":"Sea","size":"3","id":"puffer_fish","emoji":"<:puffer_fish:770704260266065953>","caughtText":" \"Tu as attrapé un poisson-porc-épic! Fais attention à ses épines!\"\n"},{"_id":"5f9317cbc0bd95022140cc5d","name":{"en":"Anchovy","fr":"Anchois"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/24/NH-Icon-anchovy.png/revision/latest?cb=20200401003129","price":"200","location":"Sea","size":"2","id":"anchovy","emoji":"<:anchovy:770704262778060800>","caughtText":" \"Tu as pris un anchois! Ne t'avise pas de venir sur ma pizza!\"\n"},{"_id":"5f9317cbc0bd95022140cc5e","name":{"en":"Horse mackerel","fr":"Chinchard"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/d/d5/NH-Icon-horsemackerel.png/revision/latest?cb=20200401003129","price":"150","location":"Sea","size":"2","id":"horse_mackerel","emoji":"<:horse_mackerel:770704264787656744>","caughtText":"Tu as pris un chinchard ! Plus cabochard que pétochard."},{"_id":"5f9317cbc0bd95022140cc5f","name":{"en":"Barred knifejaw","fr":"Scarus"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/8/8c/NH-Icon-barredknifejaw.png/revision/latest?cb=20200401003128","price":"5000","location":"Sea","size":"3","id":"barred_knifejaw","emoji":"<:barred_knifejaw:770704266104012860>","caughtText":" \"Tu as pris un scarus! Scarus, scare, scarum...\"\n"},{"_id":"5f9317cbc0bd95022140cc60","name":{"en":"Sea bass","fr":"Bar commun"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/22/NH-Icon-seabass.png/revision/latest?cb=20200401003130","price":"400","location":"Sea","size":"5","id":"sea_bass","emoji":"<:sea_bass:770704274907856896>","caughtText":" \"Tu as pris un bar commun! Gare au bar à thym!\"\n"},{"_id":"5f9317cbc0bd95022140cc61","name":{"en":"Red snapper","fr":"Vivaneau"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/d/dd/NH-Icon-redsnapper.png/revision/latest?cb=20200401003130","price":"3000","location":"Sea","size":"4","id":"red_snapper","emoji":"<:red_snapper:770704277144469514>","caughtText":" \"Tu as pris un vivaneau! Rien à voir avec le vivayaisse!\"\n"},{"_id":"5f9317cbc0bd95022140cc62","name":{"en":"Dab","fr":"Limande"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/c/c6/NH-Icon-dab.png/revision/latest?cb=20200401003129","price":"300","location":"Sea","size":"3","id":"dab","emoji":"<:dab:770704278083862561>","caughtText":" \"Tu as pris une limande! Tu as vu ses deux yeux globuleux?\"\n"},{"_id":"5f9317cbc0bd95022140cc63","name":{"en":"Olive flounder","fr":"Cardeau"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/9/9e/NH-Icon-oliveflounder.png/revision/latest?cb=20200401003129","price":"800","location":"Sea","size":"5","id":"olive_flounder","emoji":"<:olive_flounder:770704280247205929>","caughtText":" \"Tu as pris un cardeau! Il n'a pas l'air embarllé!\"\n"},{"_id":"5f9317cbc0bd95022140cc64","name":{"en":"Squid","fr":"Calmar"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/3/3b/NH-Icon-squid.png/revision/latest?cb=20200401003130","price":"500","location":"Sea","size":"3","id":"squid","emoji":"<:squid:770704282218397747>","caughtText":" \"Tu as pris un calmar! A plus tard, calmars!\"; \"Tu as pris un calmar! A plus tard, calmars...\"; \"Tu as pris un calmar! Bloups, bloups!\"\n"},{"_id":"5f9317cbc0bd95022140cc65","name":{"en":"Moray eel","fr":"Murène"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/e/e5/NH-Icon-morayeel.png/revision/latest?cb=20200401003130","price":"2000","location":"Sea","size":"Narrow","id":"moray_eel","emoji":"<:moray_eel:770704283834253362>","caughtText":" \"Tu as pris une murène! Elle habite dans un muchâteau!\"\n"},{"_id":"5f9317cbc0bd95022140cc66","name":{"en":"Ribbon eel","fr":"Murène ruban bleue"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/a/ac/NH-Icon-ribboneel.png/revision/latest?cb=20200401003129","price":"600","location":"Sea","size":"Narrow","id":"ribbon_eel","emoji":"<:ribbon_eel:770704285452599347>","caughtText":" \"Tu as pris une murène ruban bleue! On ne trouvera pas de nom plus descriptif!\"\n"},{"_id":"5f9317cbc0bd95022140cc67","name":{"en":"Tuna","fr":"Thon"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/5/50/NH-Icon-tuna.png/revision/latest?cb=20200401003129","price":"7000","location":"Pier","size":"6","id":"tuna","emoji":"<:tuna:770704287855673376>","caughtText":" \"Si ton thon tond ton tonton...\"\n"},{"_id":"5f9317cbc0bd95022140cc68","name":{"en":"Blue marlin","fr":"Marlin bleu"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/2f/NH-Icon-bluemarlin.png/revision/latest?cb=20200401003129","price":"10000","location":"Pier","size":"6","id":"blue_marlin","emoji":"<:blue_marlin:770704289638645760>","caughtText":" \"Tu as pris un marlin bleu! Il fait moins le marlin!\"\n"},{"_id":"5f9317cbc0bd95022140cc69","name":{"en":"Giant trevally","fr":"Carangue grosse tête"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/7b/NH-Icon-gianttrevally.png/revision/latest?cb=20200401003129","price":"4500","location":"Pier","size":"5","id":"giant_trevally","emoji":"<:giant_trevally:770704291479683082>","caughtText":" \"Tu as pris une carangue grosse tête! Regarde madame je-sais-tout!\"\n"},{"_id":"5f9317cbc0bd95022140cc6a","name":{"en":"Mahi-mahi","fr":"Coryphène"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/8/82/NH-Icon-mahimahi.png/revision/latest?cb=20200401003129","price":"6000","location":"Pier","size":"5","id":"mahi-mahi","emoji":"<:mahimahi:770705639659929611>","caughtText":" \"Tu as pris un coryphène! Ce n'est pas un médicament contre les douleurs!\"\n"},{"_id":"5f9317cbc0bd95022140cc6b","name":{"en":"Ocean sunfish","fr":"Lune de mer"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/5/52/NH-Icon-oceansunfish.png/revision/latest?cb=20200401003129","price":"4000","location":"Sea","size":"6 (Fin)","id":"ocean_sunfish","emoji":"<:ocean_sunfish:770704519331577917>","caughtText":" \"Tu as pris une lune de mer! Tu peux mettre les choses au clair!\"\n"},{"_id":"5f9317cbc0bd95022140cc6c","name":{"en":"Ray","fr":"Raie"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/d/db/NH-Icon-ray.png/revision/latest?cb=20200401003129","price":"3000","location":"Sea","size":"5","id":"ray","emoji":"<:ray:770704521298968627>","caughtText":" \"Tu as pris une raie! La raie était au bout de la ligne!\"\n"},{"_id":"5f9317cbc0bd95022140cc6d","name":{"en":"Saw shark","fr":"Requin scie"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/7/73/NH-Icon-sawshark.png/revision/latest?cb=20200401003129","price":"12000","location":"Sea","size":"6 (Fin)","id":"saw_shark","emoji":"<:saw_shark:770704522656874507>","caughtText":" \"Tu as pris un requin scie! Le fidèle ami du requin ébéniste!\"\n"},{"_id":"5f9317cbc0bd95022140cc6e","name":{"en":"Hammerhead shark","fr":"Requin marteau"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/2/25/NH-Icon-hammerheadshark.png/revision/latest?cb=20200401003129","price":"8000","location":"Sea","size":"6 (Fin)","id":"hammerhead_shark","emoji":"<:hammerhead_shark:770704523562975233>","caughtText":" \"Tu as pris un requin marteau! Il fait travailler sa tête...\"\n"},{"_id":"5f9317cbc0bd95022140cc6f","name":{"en":"Great white shark","fr":"Grand requin blanc"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/3/38/NH-Icon-greatwhiteshark.png/revision/latest?cb=20200401003129","price":"15000","location":"Sea","size":"6 (Fin)","id":"great_white_shark","emoji":"<:great_white_shark:770704524973178881>","caughtText":" \"Tu as pris un grand requin blanc! Ce poisson a les ailes rondes...\"\n"},{"_id":"5f9317cbc0bd95022140cc70","name":{"en":"Whale shark","fr":"Requin-baleine"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/1/1c/NH-Icon-whaleshark.png/revision/latest?cb=20200401003129","price":"13000","location":"Sea","size":"6 (Fin)","id":"whale_shark","emoji":"<:whale_shark:770704526449311765>","caughtText":" <big>Waouh!</big> Tu as pris un requin-baleine! Ça, c'est un poisson et c'est assez!\"\n"},{"_id":"5f9317cbc0bd95022140cc71","name":{"en":"Suckerfish","fr":"Rémora rayé"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/b/b9/NH-Icon-suckerfish.png/revision/latest?cb=20200401003131","price":"1500","location":"Sea","size":"6 (Fin)","id":"suckerfish","emoji":"<:suckerfish:770704527770910770>","caughtText":" Tu as pris un rémora rayé! Tu as vu sa ventouse?\"\n"},{"_id":"5f9317cbc0bd95022140cc72","name":{"en":"Football fish","fr":"Poisson lanterne"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/a/a5/NH-Icon-footballfish.png/revision/latest?cb=20200401003129","price":"2500","location":"Sea","size":"4","id":"football_fish","emoji":"<:football_fish:770704528936927273>","caughtText":" \"Tu as pris un poisson lanterne! Pourtant, il est plutôt rapide et brillant!\"\n"},{"_id":"5f9317cbc0bd95022140cc73","name":{"en":"Oarfish","fr":"Poisson-ruban"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/3/33/NH-Icon-oarfish.png/revision/latest?cb=20200401003129","price":"9000","location":"Sea","size":"6","id":"oarfish","emoji":"<:oarfish:770704530751881216>","caughtText":" \"Tu as pris un poisson-ruban! Il se déplace toujours en bande!\"\n"},{"_id":"5f9317cbc0bd95022140cc74","name":{"en":"Barreleye","fr":"Macropinna"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/c/c7/NH-Icon-barreleye.png/revision/latest?cb=20200401003128","price":"15000","location":"Sea","size":"2","id":"barreleye","emoji":"<:barreleye:770704532061421588>","caughtText":" \"Tu as pris un macropinna! On dirait un poisson-aquarium!\"\n"},{"_id":"5f9317cbc0bd95022140cc75","name":{"en":"Coelacanth","fr":"Cœlacanthe"},"image":"https://static.wikia.nocookie.net/animalcrossing/images/3/31/NH-Icon-coelacanth.png/revision/latest?cb=20200401003129","price":"15000","location":"Sea","size":"6","id":"coelacanth","emoji":"<:coelacanth:770704533314863105>","caughtText":"Oh oh ! Tu as pris un cœlacanthe ! Tu sais que ça se prononce « sé-la-kante »"}]
		for (var i in newFishTable){
			
			await mclient.db("MainDatabase").collection("Fish").updateOne({id:newFishTable[i].id},{"$set":{"caughtText":newFishTable[i].caughtText}})
		}
	}
	if (message.content.startsWith("add-all-biblio")){
		totalFish = await mclient.db("MainDatabase").collection("FishPeche").find({}).toArray();
		//console.log(totalFish)
		for (var i in totalFish){
			var alreadyFound = await bibliothequeFishList.find({fishId:totalFish[i].fishId,owner:totalFish[i].owner}).toArray()
			if (alreadyFound.length == 0){
				await bibliothequeFishList.insertOne(totalFish[i])
			}
		}*/
	}
	if (message.content.startsWith("f!biblio")){
		var messageSent = await message.channel.send({embed:embedTable.bibliotheque.loading})
		var thisPlayer =new Player(message.author.id)
		await thisPlayer.init()
		var playerInventory = await thisPlayer.getFishBibliotheque()
		//console.log(playerInventory)
		var image = await generateBibliotheque(fishTable,playerInventory)
		var thisEmbed = JSON.parse(JSON.stringify(embedTable.bibliotheque.loaded))
		thisEmbed.image = {"url":image}
		messageSent.edit({embed:thisEmbed})
	}
	if (message.content.startsWith("f!info")){
		if (message.content.split("f!info ")[1] && parseInt(message.content.split("f!info ")[1])){
			var number = parseInt(message.content.split("f!info ")[1])
			if (number>0 && number<=80){
				var correspondingFishNumber = fishTable[number-1]
				//console.log(correspondingFishNumber)
				var alreadyDiscover = await bibliothequeFishList.find({"owner":message.author.id,"fishId":correspondingFishNumber.id}).toArray()
				//console.log(alreadyDiscover)
				if (alreadyDiscover.length >= 1){
					var thisEmbed = JSON.parse(JSON.stringify(embedTable.fishInfo.success))
					thisEmbed.fields[0].value = thisEmbed.fields[0].value.replace("<fishName>",correspondingFishNumber.name.fr).replace("<fishPrice>",correspondingFishNumber.price).replace("<fishSize>",fishSizeTable[correspondingFishNumber.size])
					thisEmbed.fields[1].value = thisEmbed.fields[1].value.replace("<fishLocation>",correspondingFishNumber.location).replace("<fishCaughtText>",correspondingFishNumber.caughtText)
					thisEmbed.thumbnail = {"url":correspondingFishNumber.image}
					message.channel.send({"embed":thisEmbed})
				}else{
					message.channel.send({"embed":embedTable.fishInfo.not_discover})
				}
			}else{
				message.channel.send({"embed":embedTable.fishInfo.invalid_number})
			}
		}else{
			message.channel.send({"embed":embedTable.fishInfo.invalid_use})
		}
	}
	if (message.content.startsWith("f!set")){
		if (message.member.hasPermission("ADMINISTRATOR")){
			var messageSent = await message.channel.send({embed:embedTable.changingFishChannel.loading})
			var thisServer = new Server(message.guild.id)
			await thisServer.init()
			thisServer.fishChannel = message.channel.id
			var result = await thisServer.save()
			if (result.result.ok == 1){
				await messageSent.edit({embed:embedTable.changingFishChannel.success})
			}else{
				await messageSent.edit({embed:embedTable.changingFishChannel.error})
			}
		}else{
			await message.channel.send({embed:embedTable.changingFishChannel.permission_error})
		}
	}

	if (message.content.startsWith("f!hebergPoissons")){
		//console.log(fishTable.length)
		for (var i in fishTable){
			//console.log(i)
			if (i>=69 ){
				//console.log(1)
			var emoji = await client.guilds.cache.get("770703388543287366").emojis.create(fishTable[i].image,fishTable[i].id.replace("-",""))
			//console.log(2)
			if (emoji){
				//console.log(3)
				await mclient.db("MainDatabase").collection("Fish").updateOne({id : fishTable[i].id},{"$set":{"emoji":"<:"+emoji.name+":"+emoji.id+">"}})
				//console.log(4)
			}
		}
		}
	}
})

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://Alexis:"+process.env.mongodbpass+"@cluster0.qp9ra.mongodb.net/<dbname>?retryWrites=true&w=majority";
const mclient = new MongoClient(uri, { useNewUrlParser: true });
mclient.connect(async err => {
	//console.log("Login")
	
  client.login(process.env.token)

	setInterval(function(){
		axios.get("https://FaroffDependableTrapezoids.alexisl61.repl.co")
	},20000)
});
const express = require("express"); 
const app = express();
app.get("/",function(req,rep){
	rep.send("OK")
})
const listener = app.listen(process.env.PORT, () => {
  //console.log("Your app is listening on port " + listener.address().port);
})