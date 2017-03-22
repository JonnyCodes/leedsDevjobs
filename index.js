var Twitter = require("twitter");
var moment = require("moment");
var Secrets = require("./secrets.js");

var secrets = new Secrets();
var client = new Twitter({
	consumer_key: secrets.getConsumerKey(),
	consumer_secret: secrets.getConsumerSecret(),
	access_token_key: secrets.getAccessTokenKey(),
	access_token_secret: secrets.getAccessTokenSecret()
});

var timeout = (1000 * 60 * 60) * 2; //2 hours in miliseconds
var query = "#leeds AND (#devjob OR #devjobs OR #techjob OR #techjobs OR #ITjob OR #ITjobs OR ((#IT OR #digital OR #dev OR #developer OR #tech OR #software OR #softwaredev OR (#software AND #development)) AND (#hiring OR #job OR #jobs OR #newjob OR #newjobs OR #career OR #careers)))";
var excludes = ["-RT", "-filter:retweets", "exclude:retweets"];
var since = " since:" + moment().subtract(7, "days").format("YYYY-MM-DD");
var tweetStatuses;
var screenName = "";

for (var i = 0; i < excludes.length; i++) {
	query + " " + excludes[i];
}

getCurrentUserInfo();

function getCurrentUserInfo() {
	client.get("account/settings.json", function(error, response) {
		if(!error) {
			console.log("----------------");
			console.log("Found screen_name: " + response.screen_name);
			console.log("----------------");
			screenName = response.screen_name;
			search();
		} else {
			console.log("----------------");
			console.log("Failed to get screen name");
			console.log("----------------");
			setTimeout(function() { getCurrentUserInfo() }, timeout / 8); //Try again in 15 mins
		}
	});
}

function search() {
	client.get('search/tweets.json?', {q: query + since, result_type: "recent", count: 75}, function(error, tweets) {
		if(!error) {
			tweetStatuses = tweets.statuses;

			//Filter out retweets and tweets by the leedsdevjobs account
			for (var i = tweetStatuses.length - 1; i >= 0; i--) {
				if(tweetStatuses[i].retweeted_status && tweetStatuses[i].user.screen_name && tweetStatuses[i].user.screen_name.toLowerCase() != screenName) {
					tweetStatuses.splice(i, 1);
				}
			}

			getNextTweet();
		} else {
			console.log("----------------");
			console.log("Search failed");
			console.log("----------------");
			setTimeout(function() { search() }, timeout / 2); //Try again in 1 hour
		}
	});
}

function getNextTweet() {
	if(tweetStatuses.length > 0) {
		client.post('statuses/retweet/' + tweetStatuses[0].id_str, function(errors, tweet) {
			if (errors) {
				console.log("---- FAILED ----");
				console.log(tweetStatuses[0].text);
				console.log(errors);
				console.log("----------------");
				tweetStatuses.shift();
				getNextTweet();
			} else {
				console.log("----- TWEETED -----");
				console.log(tweet.text);
				console.log("-------------------");
				client.post('friendships/create', { user_id: tweetStatuses[0].user.id_str, follow: true });
				setTimeout(function() { search() }, timeout / 2); //If find a tweet, try tweet again in 1 hour
			}
		});
	} else {
		console.log("----------------");
		console.log("No tweets found.");
		console.log("----------------");
		setTimeout(function() { search() }, timeout); //Try again in 2 hours
	}
}