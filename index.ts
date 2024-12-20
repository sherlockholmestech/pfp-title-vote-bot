import { Bot } from "grammy";

if (!Bun.env.TOKEN) {
  throw new Error("TOKEN is not defined!!! Please provide a telegram bot token!!!");
}

// Constants.
const bot = new Bot(Bun.env.TOKEN);
const pfpjson = Bun.file("./pfp.json");
const titlejson = Bun.file("./title.json");
const pollsjson = Bun.file("./polls.json");

// Variables.
let pfp = JSON.parse('{"messages":{}}');
let title = JSON.parse('{"messages":{}}');
let polls = JSON.parse("{}");

console.log(await pfpjson.exists());
// Checks if files exist.
if (!await pfpjson.exists()) {
  Bun.write("./pfp.json", '{"messages":{}}');
  console.log("pfp.json created!");
}
console.log("pfp.json exists!");
if (await pfpjson.text() !== "") {
	console.log("pfp.json is not empty!");
	pfp = await pfpjson.json();
} else {
	console.log("pfp.json is empty, skipping reading!");
}

if (!await titlejson.exists()) {
  Bun.write("./title.json", '{"messages":{}}');
  console.log("title.json created!");
}
console.log("title.json exists!");
if (await titlejson.text() !== "") {
	console.log("title.json is not empty!");
	title = await titlejson.json();
} else {
	console.log("title.json is empty, skipping reading!");
}

if (!await pollsjson.exists()) {
  Bun.write("./polls.json", "{}");
  console.log("polls.json created!");
}
console.log("polls.json exists!");
if (await pollsjson.text() !== "") {
	console.log("polls.json is not empty!");
	polls = await pollsjson.json();
} else {
	console.log("polls.json is empty, skipping reading!");
}
// Command suggestions.
await bot.api.setMyCommands([
	{ command: "ping", description: "Pong!" },
	{command: "submitpfp", description: "Submit a new pfp with name."},
	{command: "submittitle", description: "Submit a new title."},
	{command: "vote", description: "Vote on currently submitted pfp / title!"},
	{command: "help", description: "List of commands."},
	{command: "finish", description: "Finish the pfp/title poll."}
  ]);

// Bot Commands.
bot.command("ping", async (ctx) => {
	await ctx.reply("Pong!");
});

bot.hears(/submitpfp *(.+)?/, async (ctx) => {
	const name = ctx.match[1];
	const user = ctx.from?.first_name;
	const photo = ctx.message?.photo;
	if (!name) {
		return await ctx.reply("Please provide a name of the pfp.");
	}
	if (!user) {
		return await ctx.reply("User information is missing.");
	}
	if (!photo) {
		return await ctx.reply("Please attach a photo.");
	}
	// Check if user already has a submission, if so unpins the message.
	if (pfp.messages[user] && pfp.messages[user] !== "") {
		await bot.api.unpinChatMessage(ctx.chat.id, pfp.messages[user]);
	}
	bot.api.pinChatMessage(ctx.chat.id, ctx.message?.message_id);
	pfp.messages[user] = ctx.message?.message_id;
	pfp[user] = name;
	await Bun.write(pfpjson, JSON.stringify(pfp));
	await ctx.reply("Submitted your pfp.");
});

bot.command("submittitle", async (ctx) => {
	const submittedtitle = ctx.match;
	const user = ctx.from?.first_name;
	if (!submittedtitle) {
		return await ctx.reply("Please provide a title.");
	}
	if (!user) {
		return await ctx.reply("User information is missing.");
	}
	if (title.messages[user] && title.messages[user] !== "") {
		await bot.api.unpinChatMessage(ctx.chat.id, title.messages[user]);
	}
	bot.api.pinChatMessage(ctx.chat.id, ctx.message?.message_id);
	title.messages[user] = ctx.message?.message_id;
	title[user] = submittedtitle;
	await Bun.write(titlejson, JSON.stringify(title));
	await ctx.reply("Submitted your title.");
});

bot.command("vote", async (ctx) => {
	let options = [];
	const mode = ctx.match;
	if (mode === "pfp") {
		if (JSON.stringify(pfp) === '{"messages":{}}') {
			return await ctx.reply("No pfps have been submitted.");
		}
		for (const key in pfp) {
			if (key === "messages") {
				continue;
			}
			options.push(`${key}: ${pfp[key]}`);
		}
		console.log(options);
		if (options.length < 2) {
			return await ctx.reply("Not enough pfps have been submitted.");
		}
		if (polls.pfp && polls.pfp !== "") {
			await ctx.reply("Stopping previous pfp poll...");
			await bot.api.stopPoll(ctx.chat.id, Number.parseInt(polls.pfp));
			await bot.api.unpinChatMessage(ctx.chat.id, Number.parseInt(polls.pfp));
			polls.pfp = "";
			await Bun.write(pollsjson, JSON.stringify(polls));
		}
		let pollSent = await ctx.replyWithPoll("Vote for the pfp.", options, { is_anonymous: false });
		polls.pfp = pollSent.message_id.toString();
		await bot.api.pinChatMessage(ctx.chat.id, pollSent.message_id);
		await Bun.write(pollsjson, JSON.stringify(polls));
		return;
	}
	if (mode === "title") {
		if (JSON.stringify(title) === '{"messages":{}}') {
			return await ctx.reply("No titles have been submitted.");
		}
		for (const key in title) {
			if (key === "messages") {
				continue;
			}
			options.push(`${key}: ${title[key]}`);
		}
		console.log(options);
		if (options.length < 2) {
			return await ctx.reply("Not enough pfps have been submitted.");
		}
		if (polls.title && polls.title !== "") {
			await ctx.reply("Stopping previous pfp poll...");
			await bot.api.stopPoll(ctx.chat.id, Number.parseInt(polls.title));
			await bot.api.unpinChatMessage(ctx.chat.id, Number.parseInt(polls.title));
			polls.title = "";
			await Bun.write(pollsjson, JSON.stringify(polls));
		}
		let pollSent = await ctx.replyWithPoll("Vote for the title.", options, { is_anonymous: false });
		polls.title = pollSent.message_id.toString();
		await bot.api.pinChatMessage(ctx.chat.id, pollSent.message_id);
		await Bun.write(pollsjson, JSON.stringify(polls));
		return;
	}
	if (mode === "view") {
		let currentPfpPoll = polls.pfp;
		let currentTitlePoll = polls.title;
		if (currentPfpPoll === "" || currentPfpPoll === undefined) {
			currentPfpPoll = "No pfp poll is running.";
		}
		if (currentTitlePoll === "" || currentTitlePoll === undefined) {
			currentTitlePoll = "No title poll is running.";
		}
		await ctx.reply(`Current polls: pfp: ${currentPfpPoll} title: ${currentTitlePoll}`);
		let message = "pfp submissions:\n\n";
		for (const key in pfp) {
			if (key === "messages") {
				continue;
			}
			message += `${key}: ${pfp[key]}\n`;
		}
		message += "\n\n title submissions:\n\n";
		for (const key in title) {
			if (key === "messages") {
				continue;
			}
			message += `${key}: ${title[key]}\n`;
		}
		await ctx.reply(message);
		return;
	}
	await ctx.reply("Please specify a voting mode: pfp or title.");
});

bot.command("help", async (ctx) => {
	let message = "Commands: /ping, /submitpfp, /submittitle, /vote, /help\n\n /ping: Pong!\n /submitpfp [name]: Submit a new pfp with name.  Must attach a photo!\n /submittitle [title]: Submit a new title.\n /vote [mode]: Vote on currently submitted pfp / title!  Indicate mode with either pfp or title.\n/finish [mode]: Finish the pfp/title poll.  Indicate mode with either pfp or title.";
	await ctx.reply(message);
});

bot.command("finish", async (ctx) => {
	const mode = ctx.match;
	if (mode === "pfp") {
		await ctx.reply("Stopping pfp poll...");
		if (polls.pfp && polls.pfp !== "") {
			let polldata = await bot.api.stopPoll(ctx.chat.id, Number.parseInt(polls.pfp));
			let winner = "";
			let winnerVotes = 0;
			for (const option of polldata.options) {
				if (option.voter_count > winnerVotes) {
					winner = option.text;
					winnerVotes = option.voter_count;
				}
			}
			await ctx.reply(`The winner is: ${winner} with a total of ${winnerVotes} votes!`);
			polls.pfp = "";
			await Bun.write(pollsjson, JSON.stringify(polls));
			// reset pfp.json
			await ctx.reply("Clearing all submitted pfps...");
			for (const key in pfp) {
				await bot.api.unpinChatMessage(ctx.chat.id, pfp.messages[key]);
			}
			pfp = JSON.parse('{"messages":{}}');
			await Bun.write(pfpjson, JSON.stringify(pfp));
			await ctx.reply("Done.");
			return;
		}
		return await ctx.reply("No pfp poll is running.");
	}
	if (mode === "title") {
		await ctx.reply("Stopping title poll...");
		if (polls.title && polls.title !== "") {
			await bot.api.stopPoll(ctx.chat.id, Number.parseInt(polls.title));
			polls.title = "";
			await Bun.write(pollsjson, JSON.stringify(polls));
			console.log("HI!");
			// reset title.json
			await ctx.reply("Clearing all submitted titles...");
			for (const key in title) {
				await bot.api.unpinChatMessage(ctx.chat.id, title.messages[key]);
			}
			title = JSON.parse('{"messages":{}}');
			await Bun.write(titlejson, JSON.stringify(title));
			await ctx.reply("Done.");
			return;
		}
		return await ctx.reply("No title poll is running.");
	}
	await ctx.reply("Please specify a mode: pfp or title!");
});
// Start Bot.
bot.start();