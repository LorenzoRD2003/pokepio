exports.resetBattle = (battle) => {
    battle.players = 0;
    battle.id = null;
    battle.room = null;
    battle.user1 = null;
    battle.user2 = null;
    battle.result = "";
}
