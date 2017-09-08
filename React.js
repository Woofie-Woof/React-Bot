try {
    var Discord = require("discord.js");
}
catch (e) {
    console.log(e.stack);
    console.log(process.version);
    console.log("'Discord.js' is one of the core, necessary modules for this bot to run. Please install it.");
    process.exit();
}

try {
    var fs = require("fs"); 
}
catch(e) {
    console.log("Well, no reading files, then. 'fs' is kinda necessary for that.");
    process.exit()
}

try {
    var request = require("request");
}
catch (e) {
    console.log("I'm REQUESTing you to get 'request.' I need it for pretty much everything.")
}

try{
    var auth = require("./auth.json");
}
catch(e){
    console.log("An 'auth.json' with the correct API keys is necessary to continue.");
    process.exit();
}

try {
    var sql = require('sqlite');
    sql.open('./data/data.sqlite')
}
catch(e) {
    console.log("For database keeping purposes. 'sqlite' is pretty necessary.");
}

var bot = new Discord.Client({autoReconnect: true, disableEvents: ["TYPING_START", "TYPING_STOP", "GUILD_MEMBER_SPEAKING", "GUILD_MEMBER_AVAILABLE", "PRESSENCE_UPDATE"]});

bot.login(auth.token);

bot.on("ready", function () {
	console.log('Did somebody call for a new reaction?');
    bot.user.setGame("with so many faces!");
    
    sql.migrate();

    servers = bot.guilds.array();
    servers.forEach(function(element) {
        if (!fs.existsSync("./emojis/"+ element.id)){
            fs.mkdirSync("./emojis/"+ element.id);
        }
        sql.get(`SELECT * from Servers WHERE id ='${element.id}'`).then(row => {
            if(!row){
                sql.run(`INSERT INTO Servers (id, name) VALUES (?, ?)`, [element.id, element.name]);
            }
        });
    });

    commands = {
        "mod": {
            description: "All commands to debug the bot or to carry out administrative tasks",
            help: "&help mod",
            commands:{
                "ping": {
                    usage: "&ping",
                    description: "I'll respond with a \"pong.\" Useful for checking if I'm alive.",
                    process: function(msg, params){
                        msg.channel.send("Pong!");
                    }
                }
            }
        },
        "emoji": {
            description: "All commands pertaining to working with the bot's emoji features",
            help: "&help emoji",
            commands:{
                "add": {
                    usage: "<link or image> <emoji name> (Ex. &add https://i.imgur.com/1CbmsDd.png SleepyWoof)",
                    description: "This will add a new emoji to this server's emoji list.",
                    process: function(msg, params){
                        if(msg.member.hasPermission("MANAGE_EMOJIS")){
                            var imgUrlReg = /\.(jpg|png)$/;
                            var paramsArray = params.split(" ");
                            var link = paramsArray[0];
                            var emojiName = paramsArray[1];
                            if(msg.attachments.array().length > 0){
                                link = msg.attachments.array()[0].url;
                                emojiName = paramsArray[0]
                            }

                            if(typeof emojiName == "undefined"){
                                msg.channel.send("You did not give me a name for this emoji, buddy. I kinda need it.");
                                return;
                            }

                            if(msg.guild.emojis.find("name", emojiName) != null){
                                msg.channel.send("This emoji already exists in the server.");
                                return;
                            }
                            sql.get(`SELECT * FROM Emojis WHERE serverId = '${msg.guild.id}' AND name = '${emojiName}'`).then(row => {
                                if(row){
                                    msg.channel.send("This emoji already exists in the database.");
                                    return;
                                }
                            });

                            match = imgUrlReg.exec(link);
                            if(match != null){
                                request.head(link, function(err, res, body){                             
                                    request(link).pipe(fs.createWriteStream(__dirname + "\\emojis\\" + msg.guild.id + "\\" + emojiName + match[0])).on('close', function (){
                                        console.log("Image saved.");
                                    });
                                });

                                sql.run('INSERT INTO Emojis (serverId, name, isGlobal, imagePath) VALUES (?, ?, ?, ?)', [msg.guild.id, emojiName, 0, "\\emojis\\" + msg.guild.id + "\\" + emojiName + match[0]]);
                                msg.channel.send("New emoji '" + emojiName + "' successfully added.");
                                return;
                            }

                            msg.channel.send("I don't believe that's an image, buddy.");
                        }

                        msg.channel.send("Sorry, bud, but you don't have sufficient permissions to edit server emojis.");
                    }
                },
                "remove":{
                    usage: "<emoji name> (Ex. &remove SleepyWoof)",
                    description: "Removes a previously added emoji from this server's database.",
                    process: function(msg, params) {
                        if(msg.member.hasPermission("MANAGE_EMOJIS")){
                            sql.get(`SELECT * FROM Emojis WHERE name = '${params}'`).then(row => {
                                if(!row){
                                    msg.channel.send("'" + params + "' doesn't seem to exist in the database.");
                                    return;
                                }

                                fs.unlink(__dirname + row.imagePath);
                                sql.run(`DELETE FROM Emojis WHERE id = '${row.id}'`);
                                msg.channel.send("Emoji '" + params + "' was successfully removed.");
                            });
                        }

                        msg.channel.send("Sorry, bud, but you don't have sufficient permissions to edit server emojis.");
                    }
                },
                "list":{
                    usage: "&list",
                    description: "Shows a listing of the emojis in the database for this server.",
                    process: function(msg, params){
                        sql.all(`SELECT * FROM Emojis WHERE serverId = '${msg.guild.id}'`).then(rows => {
                            if(rows.length === 0){
                                msg.channel.send("This server has no recorded emojis in the database.");
                                return;
                            }
                            var listString = "**__This server has the following emojis:__**";
                            for (var key in rows) {
                                if (rows.hasOwnProperty(key)) {
                                    var row = rows[key];
                                    listString += "\n" + row.name;
                                }
                            }

                            msg.channel.send(listString);
                        });
                    }
                }
            }
        }
    }
});

bot.on("message", function (msg) {
    if(msg.author.id != bot.user.id && msg.channel.type === "dm"){
        msg.channel.send("This bot has no reason to be used in DMs. Please go to a server to use it.");
        return;
    }
    if (msg.author.id != bot.user.id && msg.content[0] === ":" && msg.content[msg.content.length - 1] === ":"){
        var emojiName = msg.content.replace(/:/g, "");
        if(msg.guild.emojis.find("name", emojiName) != null){
            return;
        }
        sql.get(`SELECT * FROM Emojis WHERE serverId = '${msg.guild.id}' AND name = '${emojiName}'`).then(row => {
            if(!row){
                return;
            }
            msg.delete();
            msg.channel.send(`**${msg.member.displayName}** says:`, {file: __dirname + row.imagePath});
        });
    }
    if (msg.author.id != bot.user.id && msg.content[0] === "&"){
        var msgcmd = msg.content.split(" ")[0].substring(1);
        var params = msg.content.substring(msgcmd.length + 2);

        if(msgcmd == "help"){
            console.log("<@" + msg.author.id + ">" + " asks for &" + msgcmd + " " + params);
            var info = "```";
            if(params){
                if(commands[params]){
                    msg.channel.send("These are the commands for the module **" + params + "**:").then(msg => {
                        for(var command in commands[params].commands){
                            info += "&" + command;
                            var usage = commands[params].commands[command].usage;
                            if(usage){
                                info += " " + usage;
                            }
                            var description = commands[params].commands[command].description;
                            if(description){
                                info += "\n\t" + description + "\n\n";
                            }
                        }
                        info += "```";
                        msg.channel.send(info);
                    });
                }
                else{
                     msg.channel.send("I was unable to find that module.");
                }
                return;
            }
            else{
                msg.channel.send("Choose a module to see commands for:").then(msg => {
                    for(var module in commands) {
                        info += module;
                        var help = commands[module].help;
                        if(help){
                            info += " - " + help;
                        }
                        var description = commands[module].description;
                        if(description){
                            info += "\n\t" + description + "\n\n";
                        }
                    }
                    info += "```";
                    msg.channel.send(info);
                    return;
                });
            }
        }

        for(var module in commands){
            var cmd = commands[module].commands[msgcmd];
            if(cmd){
                console.log("Received command `&" + msgcmd + "` from user <@" + msg.author.id + ">");
                cmd.process(msg, params);
            }
        }
    }
});