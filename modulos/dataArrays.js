const fs = require("fs");

exports.allTypes = JSON.parse(fs.readFileSync("./files/allTypesList.json", "utf-8"));
exports.allMoves = JSON.parse(fs.readFileSync("./files/allMovesList.json", "utf-8"));
exports.pokemonList = JSON.parse(fs.readFileSync("./files/allPokemonList.json", "utf-8"));
exports.pokemonNamesList = JSON.parse(fs.readFileSync("./files/allPokemonNamesList.json", "utf-8"));
exports.naturesList = JSON.parse(fs.readFileSync("./files/allNaturesList.json", "utf-8"));
exports.itemsList = JSON.parse(fs.readFileSync("./files/allItemsList.json", "utf-8"));
exports.allAbilities = JSON.parse(fs.readFileSync("./files/allAbilitiesList.json", "utf-8"));