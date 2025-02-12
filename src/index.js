const ONE_MINUTE = 60 * 1000;
const EIGHT_HOURS = 8 * 60 * ONE_MINUTE;
const TEN_MINUTES = 10 * ONE_MINUTE;

const JIFFY_WIDE = "<:jiffyWide1:1081822599828488203><:jiffyWide2:1081822658733289502><:jiffyWide3:1081822693986402404>";
const CHRIST = "<:ASSONLYSON:1059909040647446668>";

const GET_LOUD = "**GET LOUD!!!** " + JIFFY_WIDE;
const DONT_GET_LOUD = "don't get loud pls " + CHRIST;

export default {
	async fetch(request, env, _) {
		const url = new URL(request.url);

		if (url.pathname !== "/") {
			return new Response("no");
		}

		const query = url.searchParams;

		if (!query.has("key") || query.get("key") !== env.SECRET_KEY) {
			console.log("bad key");
			return new Response("no");
		};

		const timestamp = query.get("ts");

		await this.run(timestamp, env);

		return new Response("ok");
	},

	async scheduled(event, env, __) {
		await this.run(event.scheduledTime, env);
	},

	async discord(url, message) {
		await fetch(url + "?wait=true", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				content: message,
				username: "genes[ass]",
				avatar_url: "https://viboof.com/adamgun.png",
			})
		})
	},

	async run(timestamp, env) {
		// account for GMT-8 and the fact that the cron is 10 minutes before pool
		const date = new Date(timestamp - EIGHT_HOURS + TEN_MINUTES);
		console.log("date:", date);

		const discordUrl = env.DISCORD_WEBHOOK_URL;
		const googleApiKey = env.GOOGLE_API_KEY;
		const sheetId = env.SHEET_ID;

		const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets/" + sheetId + "/values/A3:E?key=" + googleApiKey);
		const values = (await res.json()).values;

		const month = date.getMonth() + 1;  // 2
		const day = date.getDate();  // 14
		const todayDate = month + "/" + day;  // 2/14

		let hours = date.getHours();
		let minutes = date.getMinutes();
		let suffix = "am";

		if (hours === 0) {
			// 0am -> 12am - this edge case will never matter
			hours = 12;
		} else if (hours === 12) {
			// 12"am" -> 12pm - this edge case will also never matter
			suffix = "pm";
		} else if (hours > 12) {
			// 13am -> 1pm
			hours -= 12;
			suffix = "pm";
		}

		if (minutes < 10) {
			// 1:1pm -> 1:01pm
			minutes = "0" + minutes;
		}

		const todayTime = hours + ":" + minutes + suffix;

		const players = [];

		console.log(values);
		for (let [player, date, time, pool, getLoud] of values) {
			player = player.trim();
			date = date.trim();
			time = time.trim();
			pool = pool.trim();
			getLoud = getLoud.trim();

			console.log("player:", player);
			if (!player) continue;
			console.log("date:", date, "todayDate:", todayDate);
			if (date !== todayDate) continue;
			console.log("time:", time.toLowerCase().replaceAll(" ", ""), "todayTime:", todayTime);
			if (time.toLowerCase().replaceAll(" ", "") !== todayTime) continue;

			players.push(
				"- " +
				player + 
				" in pool " + 
				pool + 
				" - " + 
				(getLoud === "TRUE" ? GET_LOUD : DONT_GET_LOUD)
			);
		}

		if (!players.length) {
			return;
		}
		
		await this.discord(
			discordUrl, 
			"<@&1338976740759830568> Upcoming Oregon Melee sets at " + todayTime + ":\n\n" +
			players.join("\n") + "\n\n" +
			"[spreadsheet](https://docs.google.com/spreadsheets/d/" + sheetId + "/edit) - [source code](https://github.com/viboof/pdgx2)"
		);
	},
};
