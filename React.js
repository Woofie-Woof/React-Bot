try {
    var Discord = require("discord.js");
}
catch (e) {
    console.log(e.stack);
    console.log(process.version);
    console.log("'Discord.js' is one of the core, necessary modules for this bot to run. Please install it.");
    process.exit();
}

try{
    var auth = require("./auth.json");
}
catch(e){
    console.log("An 'auth.json' with the correct API keys is necessary to continue.");
    process.exit();
}

var bot = new Discord.Client({autoReconnect: true, disableEvents: ["TYPING_START", "TYPING_STOP", "GUILD_MEMBER_SPEAKING", "GUILD_MEMBER_AVAILABLE", "PRESSENCE_UPDATE"]});

bot.login(auth.token);

bot.on("ready", function () {
	console.log('Did somebody call for a new reaction?');
	bot.user.setGame("with so many faces!");
});