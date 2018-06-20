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
    var newDBFlag = false;
    if (!fs.existsSync("./data/data.db")){
        newDBFlag = true;
    }

    var Database = require('better-sqlite3');
    var db = new Database('./data/data.db');
}
catch(e) {
    console.error(e);
    process.exit();
}

var cloudinary = require('cloudinary');

cloudinary.config({ 
    cloud_name: 'woofie', 
    api_key: auth.cloudinary, 
    api_secret: auth.cloud_secret 
});

try{
    var simpleGit = require('simple-git');
}
catch(e){
    console.log("You're missing 'simple-git' from your dependencies! Surely you want this bot to update, right?");
}

try{
    var exec = require('child_process').exec;
}
catch(e){
    console.log("Now now, if you don't have 'child_process', React won't be able to restart.");
}

var row;

var bot = new Discord.Client({autoReconnect: true, disableEvents: ["TYPING_START", "TYPING_STOP", "GUILD_MEMBER_SPEAKING", "GUILD_MEMBER_AVAILABLE", "PRESSENCE_UPDATE"]});

bot.login(auth.token);

bot.on("ready", function () {
	console.log('Did somebody call for a new reaction?');
    bot.user.setPresence({game:{name:"with so many faces!"}, status: "online"});
    
    if(newDBFlag){
        db.prepare('CREATE TABLE Servers (id INTEGER PRIMARY KEY, name TEXT)').run();
        db.prepare('CREATE TABLE Emojis (id INTEGER PRIMARY KEY, serverId INTEGER NOT NULL, name TEXT NOT NULL, imageUrl TEXT, cloudinaryId TEXT, isGlobal NUMERIC NOT NULL DEFAULT 0, CONSTRAINT Emoji_fk_serverId FOREIGN KEY (serverId) REFERENCES Servers (id) ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT Post_ck_isPublished CHECK (isGlobal IN (0, 1)))').run();
        db.prepare('CREATE INDEX Emoji_ix_serverId ON Emojis (serverId)').run();
    }

    servers = bot.guilds.array();
    servers.forEach(function(element) {
        row = db.prepare(`SELECT * from Servers WHERE id = ?`).get(element.id);

        if(!row){
            db.prepare(`INSERT INTO Servers (id, name) VALUES (?, ?)`).run(element.id, element.name);
        }
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
                },
                "pull": {
                    usage: "&pull",
                    description: "Will check if there is a new commit available. If commit is found, will attempt to restart with the new code.",
                    process: function(msg, params){
                        if (msg.author.id === "110932722322505728"){
                            msg.channel.send("Checking for updates...");
                            simpleGit().pull(function(error, update) {
                                if(update && update.summary.changes) {
                                    msg.channel.send("Be right back!").then(message => {
                                        exec('forever restart react', (error, stdout, stderr) => {
                                            if (error) {
                                                console.error(`exec error: ${error}`);
                                                return;
                                            }
                                            console.log(`stdout: ${stdout}`);
                                            console.log(`stderr: ${stderr}`);
                                        });
                                    }).catch(console.log);
                                }
                                else{
                                    msg.channel.send("Already up to date.");
                                    console.log(error);
                                }
                            });
                        }
                        else{
                            msg.reply("I can't really take that order from you. Sorry. :c");
                        }
                    }
                },
    
                "restart": {
                    usage: "!restart",
                    description: "Forces React-Bot to restart without needing to update.",
                    process: function(msg, params){
                        if (msg.author.id === "110932722322505728"){
                            msg.channel.send("Be right back!").then(message => {
                                exec('forever restart react', (error, stdout, stderr) => {
                                    if (error) {
                                        console.error(`exec error: ${error}`);
                                        return;
                                    }
                                    console.log(`stdout: ${stdout}`);
                                    console.log(`stderr: ${stderr}`);
                                });
                            }).catch(console.log);
                        }
                    }
                },

                "bye": {
                    usage: "&bye",
                    description: "Shuts down the bot.",
                    process: function(msg, params){
                        console.log(msg);
                        if (msg.author.id === "110932722322505728") {
                            msg.channel.send("Goodbye, everyone!").then(message => {
                                exec('forever stop react')
                            });
                        }
                        else {
                            msg.reply("I can't really take that order from you. Sorry. :c");
                        }
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
                        if(!msg.member.hasPermission("MANAGE_EMOJIS")){
                            msg.channel.send("Sorry, bud, but you don't have sufficient permissions to edit server emojis.");
                        }
                        var imgUrlReg = /\.(jpg|png|gif)$/;
                        var paramsArray = params.split(" ");
                        var link = paramsArray[0];
                        var emojiName = paramsArray[1];
                        var alreadyExists = false;
                        var imageUrl = "";
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

                        row = db.prepare(`SELECT * FROM Emojis WHERE serverId = ? AND name = ?`).get(msg.guild.id, emojiName);

                        if(row){
                            alreadyExists = true;
                        }

                        if(alreadyExists){
                            msg.channel.send("This emoji already exists in the database.");
                            return;
                        }

                        match = imgUrlReg.exec(link.toLowerCase());
                        if(match == null){
                            msg.channel.send("I don't believe that's an image, buddy.");
                            return;
                        }
                        msg.channel.send("Gimme a moment to upload this image...").then(message => {
                            cloudinary.uploader.upload(link, function(result) { 
                                db.prepare('INSERT INTO Emojis (serverId, name, isGlobal, imageUrl, cloudinaryId) VALUES (?, ?, ?, ?, ?)').run(msg.guild.id, emojiName, 0, result.url, result.public_id);
                                message.edit("Emoji '" + emojiName + "' successfully saved.");
                            });
                        });
                    }
                },
                "remove":{
                    usage: "<emoji name> (Ex. &remove SleepyWoof)",
                    description: "Removes a previously added emoji from this server's database.",
                    process: function(msg, params) {
                        if(msg.member.hasPermission("MANAGE_EMOJIS")){
                            row = db.prepare(`SELECT * FROM Emojis WHERE name = ?`).get(params);
                            if(!row){
                                msg.channel.send("'" + params + "' doesn't seem to exist in the database.");
                                return;
                            }

                            cloudinary.uploader.destroy(row.cloudinaryId, function(result,error) {
                                if(error){
                                    console.log('Error deleting image');
                                }
                            });

                            db.prepare(`DELETE FROM Emojis WHERE id = ?`).run(row.id);
                            msg.channel.send("Emoji '" + params + "' was successfully removed.");
                            
                            return;
                        }

                        msg.channel.send("Sorry, bud, but you don't have sufficient permissions to edit server emojis.");
                    }
                },
                "update":{
                    usage: "<emoji name> <'name' or 'image'> <new image or name> (Ex. &update SleepyWoof name WoofSleep)",
                    description: "Updates the specified parameter for the given emoji.",
                    process: function(msg, params) {
                        if(!msg.member.hasPermission("MANAGE_EMOJIS")){
                            msg.channel.send("Sorry, bud, but you don't have sufficient permissions to edit server emojis.");
                            return;
                        }
                        paramsArray = params.split(" ");
                        if(paramsArray.length < 2){
                            msg.channel.send("**Not enough paramenters** there, pal. Give me something like `&update SleepyWoof name WoofSlep`");
                            return;
                        }
                        row = db.prepare(`SELECT * FROM Emojis WHERE name = ? AND serverId = ?`).get(paramsArray[0], msg.guild.id);

                        if(!row){
                            msg.channel.send("'" + paramsArray[0] + "' doesn't seem to exist in the database.");
                            return;
                        }

                        if(paramsArray[1] == "name"){
                            if(paramsArray[2] == undefined){
                                msg.channel.send("You're not giving me a name to update to here.");
                                return;
                            }
                            db.prepare(`UPDATE Emojis SET name=? WHERE id=?`).run(paramsArray[2], row.id);
                            row.name = paramsArray[2];
                            msg.channel.send("Emoji '" + row.name + "' successfully updated.");
                            return;
                        }
                        else if(paramsArray[1] == "image"){
                            var link = paramsArray[2];
                            if(msg.attachments.array().length > 0){
                                link = msg.attachments.array()[0].url;
                            }

                            if(link == null || link == undefined){
                                msg.channel.send("You kinda need a new image to update to. Just sayin'.");
                                return;
                            }
                            
                            var imgUrlReg = /\.(jpg|png|gif)$/;
                            match = imgUrlReg.exec(link);
                            console.log(match);
                            if(match == null){
                                msg.channel.send("I don't believe that's an image, buddy.");
                                return;
                            }

                            cloudinary.uploader.destroy(row.cloudinaryId, function(result,error) {
                                if(error){
                                    console.log('Error deleting image');
                                }
                            });

                            msg.channel.send("Gimme a moment to upload this image...").then(message => {
                                cloudinary.uploader.upload(link, function(result) {
                                    db.prepare(`UPDATE Emojis SET imageUrl=? WHERE id=?`).run(result.url, row.id);
                                    db.prepare(`UPDATE Emojis SET cloudinaryId=? WHERE id=?`).run(result.public_id, row.id);
                                    message.edit("Emoji '" + row.name + "' successfully saved.");
                                });
                            });
                        }
                    }
                },
                "list":{
                    usage: "&list",
                    description: "Shows a listing of the emojis in the database for this server.",
                    process: function(msg, params){
                        var rows = db.prepare(`SELECT * FROM Emojis WHERE serverId = ?`).all(msg.guild.id);

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
        
        row = db.prepare(`SELECT * FROM Emojis WHERE serverId = ? AND name = ?`).get(msg.guild.id, emojiName);
        
        if(!row){
            return;
        }
        var emoteEmbed = new Discord.RichEmbed();
        emoteEmbed.setAuthor(msg.member.displayName, msg.author.avatarURL);
        emoteEmbed.setColor(msg.member.displayColor);
        emoteEmbed.setImage(row.imageUrl);

        msg.delete();
        msg.channel.send("", {embed: emoteEmbed});
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