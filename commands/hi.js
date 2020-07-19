module.exports = {
	name        : 'hi',
	description : 'Greeting',
	execute(message, args) {
		message.channel.send(`Hi, ${message.author.username}!`);
	}
};
