const { MessageAttachment } = require('discord.js');
const axios = require('axios');
const { riotToken } = require('../config.js');

module.exports = {
	name        : 'last',
	args        : true,
	description : 'Get the stats of the last game played by Riot ID.',
	usage       : '<Riot ID>',
	async execute(message, args) {
		// Retrieve Stats of Last Played Game
		let playerGameStats;
		let playerObject;
		let allGameStats;
		try {
			// Retrieve Object Containing User Info
			let riotID = args.join('');
			for (let i = 0; i < riotID.length; i++) {
				if (riotID[i] === 'Ž') {
					riotID = riotID.slice(0, i) + encodeURIComponent('Ž') + riotID.slice(i + 1);
				}
			}
			playerObject = await axios.get(
				`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${riotID}`,
				{
					params : {
						api_key : riotToken
					}
				}
			);
			const { accountId } = playerObject.data;

			// Retrieve Latest Match(es)
			const gameLog = await axios.get(
				`https://na1.api.riotgames.com/lol/match/v4/matchlists/by-account/${accountId}`,
				{
					params : {
						api_key  : riotToken,
						endIndex : 1
					}
				}
			);

			const gameData = gameLog.data.matches[0];

			// console.log("---Player's Game Data---\n", gameData);

			// Retrieve Player's Stats for Latest Match
			allGameStats = await axios.get(`https://na1.api.riotgames.com/lol/match/v4/matches/${gameData.gameId}`, {
				params : {
					api_key : riotToken
				}
			});

			playerGameStats = allGameStats.data.participants.filter((player) => {
				return player.championId === gameData.champion;
			});

			// console.log("---Player's Game Stats---\n", playerGameStats);
		} catch (error) {
			message.channel.send('Something went wrong. Make sure you entered a valid Riot ID.');
			console.error(error);
		}

		playerGameStats = playerGameStats[0];

		// Retrieve Data for Embed
		const { win, kills, deaths, assists } = playerGameStats.stats;
		const { name } = playerObject.data;
		const { profileIconId } = playerObject.data;
		const victoryPNG = new MessageAttachment('icons/victory.png');
		const defeatPNG = new MessageAttachment('icons/defeat.png');
		const statBotPNG = new MessageAttachment('icons/statbot.png');
		const gameCreation = new Date(allGameStats.data.gameCreation);

		// -- get champion info
		const { championId } = playerGameStats;
		let championList = await axios.get(`http://ddragon.leagueoflegends.com/cdn/10.14.1/data/en_US/champion.json`);
		championList = championList.data.data;
		let champion;
		for (let champName in championList) {
			if (championList[champName].key == championId) {
				champion = championList[champName];
			}
		}

		// Put data in embed
		const embedStats = {
			color       : win ? '#25cbf8' : '#f85048',
			title       : 'Last Game Played',
			author      : {
				name     : name,
				icon_url : `http://ddragon.leagueoflegends.com/cdn/10.14.1/img/profileicon/${profileIconId}.png`
			},
			description : `${gameCreation.toLocaleTimeString('en-US', {
				timeZone     : 'America/New_York',
				timeZoneName : 'short',
				hour         : 'numeric',
				minute       : '2-digit',
				weekday      : 'long',
				month        : 'long',
				day          : 'numeric'
			})}`,
			thumbnail   : {
				url : `http://ddragon.leagueoflegends.com/cdn/10.14.1/img/champion/${champion.name}.png`
			},
			fields      : [
				{
					name   : 'Champion',
					value  : `${champion.name}`,
					inline : true
				},
				{
					name   : 'Role',
					value  : `${playerGameStats.timeline.role}`,
					inline : true
				},
				{
					name   : 'Lane',
					value  : `${playerGameStats.timeline.lane}`,
					inline : true
				},
				{
					name  : 'Highest Streak',
					value : `${playerGameStats.stats.largestKillingSpree}`
				},
				{
					name  : 'Largest Multi Kill',
					value : playerGameStats.stats.unrealKills
						? `Unreal Kill\n`
						: playerGameStats.stats.pentaKills
							? `Penta Kill\n`
							: playerGameStats.stats.quadraKills
								? `Quadra Kill\n`
								: playerGameStats.stats.tripleKills
									? `Triple Kill`
									: playerGameStats.stats.doubleKills ? `Double Kill\n` : `Single Kill\n`
				},
				{
					name   : 'Kills',
					value  : `${kills}`,
					inline : true
				},
				{
					name   : 'Deaths',
					value  : `${deaths}`,
					inline : true
				},
				{
					name   : 'Assists',
					value  : `${assists}`,
					inline : true
				}
			],
			image       : {
				url : win ? 'attachment://victory.png' : 'attachment://defeat.png'
			},
			timestamp   : new Date(),
			footer      : {
				text     : 'StatBot',
				icon_url : 'attachment://statbot.png'
			}
		};

		message.channel.send({
			files : [
				win ? victoryPNG : defeatPNG,
				statBotPNG
			],
			embed : embedStats
		});
	}
};
