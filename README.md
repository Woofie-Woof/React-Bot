# React Bot

A bot for the Discord app based on [Discord.js](https://github.com/hydrabolt/discord.js/).

React Bot is designed to store images inside a database to simulate additional emoji slots per server. It will automatically resize images as needed and it is fully customizable.

# Commands

The bot's commands are divided in different "modules", each serving a different purpose. These are outlined below:

**&help** - Will show a list of available modules, if followed by a module name, will show a list of available commands in that module.

##Emoji - All commands based around adding or saving new "emojis" into the database.

**&add** - This will add a new emoji to this server's emoji list.

**&remove** - Removes a previously added emoji from this server's database.

**&list** - Shows a listing of the emojis in the database for this server.

#Posting the Emojis

The bot will read messages and try to convert messages that are formatted like an emoji (i.e. :emoji:) into one of the images in the database if the posted emoji code isn't already found inside the server's actual custom emojis.
