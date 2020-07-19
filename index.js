const fs = require('fs');
const Discord = require('discord.js');
const { prefix, discordToken } = require('./config.js');

const client = new Discord.Client({
	ws : {
		intents : [
			'GUILDS',
			'GUILD_MESSAGES'
		]
	}
});
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('guildCreate', (guild) => {
	let defaultChannel = '';
	guild.channels.cache.forEach((channel) => {
		if (channel.type == 'text' && defaultChannel == '') {
			if (channel.permissionsFor(guild.me).has('SEND_MESSAGES')) {
				defaultChannel = channel;
			}
		}
	});
	//defaultChannel will be the channel object that the bot first finds permissions for
	defaultChannel.send(`Hello! I'm StatBot. To access my list of commands, send \`stats help\`.`);
});

client.on('message', (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	// Get args
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	// Get command
	const command =
		client.commands.get(commandName) ||
		client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	// Prevent server-only commands from being executed in DMs
	if (command.guildOnly && message.channel.type !== 'text') {
		return message.reply("I can't execute that command inside DMs!");
	}

	// Command cooldown chech/set
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(
				`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`
			);
		}
	}
	else {
		timestamps.set(message.author.id, now);
		setTimeout(() => {
			timestamps.delete(message.author.id);
		}, cooldownAmount);
	}

	// Check if required args are there
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix} ${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	// Command execution
	try {
		command.execute(message, args);
	} catch (err) {
		console.log(err);
		message.reply('There was an error trying to execute that command!');
	}
});

process.on('unhandledRejection', (error) => console.error('Uncaught Promise Rejection', error));

client.login(discordToken);
