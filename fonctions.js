var fishTable
const fs = require("fs");
var rarity = JSON.parse(fs.readFileSync("./json-folder/rarity/rarity-available.json"))
var rarity_info = JSON.parse(fs.readFileSync("./json-folder/rarity/rarity-info.json"))
function delay(ms) { 
      return new Promise(resolve => setTimeout(resolve, ms));
    }
		
function getFishRarity(fishId){
  if (fishTable.find(thisFish=> fishId == thisFish.id)){
    var fishFound = fishTable.find(thisFish=> fishId == thisFish.id)
    var currentRarity = 0
    for (var i in rarity){
      if (fishFound.price>=rarity_info[rarity[i]].fishData.minimalPrice){
        currentRarity = i
      }
    }
    console.log(rarity[currentRarity])
    return rarity_info[rarity[currentRarity]]
  }
}

module.exports={
	functionsInit : function(fT){
		fishTable = fT
	},
	
getRandomFish : function(){
  var fishAvailable = []
  for (var i in fishTable){
    //if (fishList[i].location.includes(location)){
      var rarity = getFishRarity(fishTable[i].id)
      for (var a = 0;a< rarity.fishData.size;a++){
        fishAvailable.push(fishTable[i])
      }
    //const Database = require("@replit/database")}
  }
  var randomFish = fishAvailable[Math.floor(Math.random()*fishAvailable.length)]
  console.log(randomFish)
  return randomFish
},
	waitRandomTime : async function(min,max){
		var randomNumber = Math.floor(Math.random()*(max-min)) + min
		await delay(randomNumber)
		return
	},
	getFishRarity:	getFishRarity
}