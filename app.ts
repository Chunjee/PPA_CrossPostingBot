///--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\
// Description
//\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/--\--/
// Watches Twitter Streaming API for relevent posts to be crossposted to archive.is and reddit
//

'use strict';

// --------------{ includes }------------- // 
var stream = require('user-stream'),
	snoowrap = require('snoowrap'),
	archive = require('archive.is'),
	moment = require('moment'),
	fs = require('fs'),
	colors = require('colors');

// --------------{ config }------------- // 

const scriptconfig:any = JSON.parse(fs.readFileSync(process.cwd() + '/config/config.dat'));
/*
const scriptconfig = {
	"twitterid": "blank",
	"subreddit": "blank"
};
*/
const redditconfig:any = JSON.parse(fs.readFileSync(process.cwd() + '/config/redditconfig.dat'));
/*
const redditconfig = {
	"client_id": "blank",
	"client_secret": "blank",
	"username": "blank",
	"password": "blank",
	"user_agent": "blank"
};
*/
const twitterconfig:any = JSON.parse(fs.readFileSync(process.cwd() + '/config/twitterconfig.dat'));
/*
{
    "consumer_key": "blank",
    "consumer_secret": "blank",
    "access_token_key": "blank",
    "access_token_secret": "blank"
}
*/

// --------------{ classes }------------- //
import Tweet = require("./classes/Tweet");
//unfinished commentstack class
class CommentStack {
	public _comments:string[] = [];


	//shifts off the 
	shift() {
		return this._comments.shift();
	}
}

// --------------{ constants & variables }------------- // 
var 
	scriptstatus = {
		canpost: true
	},

	DEBUG = {
		mode: true
	}

	colors.setTheme({
		debug: 'blue',
		info: 'green',
		data: 'grey',
		help: 'cyan',
		warn: 'yellow',
		error: 'red',
		input: 'grey',
		prompt: 'grey'
	});

var	link_array:string[] = JSON.parse(fs.readFileSync(process.cwd() + '/config/links.txt'));
	//link_array:string[] = ["http://google.com"];
//
var responses_array:string[] = JSON.parse(fs.readFileSync(process.cwd() + '/config/responses.txt'));
//var responses_array:string[] = ["examplere response"];

//Top level vars
var
	t = new stream(twitterconfig),
	r = new snoowrap(redditconfig),
	tweets_array = [],
	posted_array = [];

//debugging with fake tweet
var simutweet = {
	user: {
		id_str: 11111111
	},
	text: "Remember that time...",
	id_str: "tweetid"
}
var testertweet = new Tweet(simutweet);
//tweets_array.push(testertweet);
//process.exit();

// --------------{ MAIN }------------- // 
console.log(moment().format('h:mm a') + ' SCRIPT STARTED'.rainbow);

var TryPost 	= setInterval(function(){ PostToReddit() }, 10*1000); //every 10 seconds, try to post any qued posts
var TryComment 	= setInterval(function(){ TryToComment() }, 10*1000); //every 10 seconds, try to comment
var CanPost 	= setInterval(function(){ scriptstatus.canpost = true }, 11*60*1000); //every 11 mins, reload status.canpost to true so TryPost can succeed
var HeartBeat 	= setInterval(function(){ console.log(moment().format('h:mm a ') + ' ~ Still running'.green)}, 30*60*1000); //HeartBeat every .5 hour


//create twitter listening stream
var params = {
    with: "followings"
};
t.stream(params);
//listen stream data

t.on('data', function(data:any) {
	//console.log(data);
	//if a tweet by the user we are watching
	if (data.user.id == scriptconfig.twitterid) {
		var newtweet:any = new Tweet(data);
		
		if (!fn_InStr(data.text,'RT') || newtweet._text.legth > 10) { //do not post ReTweets or super short tweets
			console.log(moment().format('h:mm a ') + (newtweet._username + ' said: ' + newtweet._text).green);
			tweets_array.push(newtweet);
			console.log('added to que'.green);
		} else {
			console.log(moment().format('h:mm a ') + (newtweet._username + ' said: ' + newtweet._originaltext).yellow);
		}
	}
});
 

//connected
t.on('connected', function(){
	console.log(moment().format('h:mm a ') + 'Stream created'.green);
});
//heartbeats
t.on('heartbeat', function(){
    //console.log('Heartbeat');
});
//incorrect json strings (can't parse to json)
t.on('garbage', function(data){
	//console.log(colors.green(moment().format('h:mm a') + ' Can\'t be formatted:'));
    //console.log(data);
});
//connection errors (request || response)
t.on('error', function(error){
	console.log(moment().format('h:mm a ') + 'Connection error:'.yellow);
    console.log(error);
});
//close event (try to reconnect)
t.on('close', function(error){
	console.log(moment().format('h:mm a ') + 'Stream closed:'.red);
    console.log(error);
	console.log(moment().format('h:mm a ') + 'Attempting reconnect'.yellow);
	t.stream(params);
});


// --------------{ top functions }------------- // 

var PostToReddit = function() {
	//only proceed if there are tweets in the array
	if (tweets_array.length !== 0 && scriptstatus.canpost == true) {
		var thistweet:any = tweets_array.shift();
		archive.save(thistweet._permalink.toString()).then(function(archiveresult){
			if (archiveresult.shortUrl && archiveresult.alreadyExists !== true) {
				Sb_SubmitLink(thistweet._text, archiveresult.shortUrl);
				scriptstatus.canpost = false;
				CanPost = setInterval(function(){ scriptstatus.canpost = true }, 11*60*1000);
			}
		});
	} else {
		//console.log("no tweets in memory to handle");
	}
}


function Sb_SubmitLink(para_post, para_url) {
	//console.log(para_post + " , " + para_url);
	if (para_url) {
		r.getSubreddit(scriptconfig.subreddit).submitLink({title: 'Twitter: "' + para_post + '"', url: para_url }).then(function(submition){
			console.log(moment().format('h:mm a ') + ('POSTED: ' + submition.name).green);
			//posted_array.push(submition.name);
			fs.appendFileSync(process.cwd() + '/repliedIDs.dat', submition.name + "`n");
		});
	}
	// else if (para_post) { //if no url
	//	r.getSubreddit(scriptconfig.subreddit).submitSelfpost({title: 'Twitter: "' + para_post + '"', text: '[' + responses_array[Math.floor(Math.random() * responses_array.length)] + '](' + musiclink + ') \n\n' + ' [-link-](' + para_url + ')'}).then(console.log);
	//}
return;
}


function TryToComment() {
	if (posted_array.length !== 0 && scriptstatus.canpost == true) {
		var musiclink = link_array[Math.floor(Math.random() * link_array.length)];
		var replytext = responses_array[Math.floor(Math.random() * responses_array.length)];
		replytext = '[' + fn_addMusic(3) + " " + replytext + " " + fn_addMusic(3) + '](' + musiclink + ')';
		console.log(moment().format('h:mm a ') + ('Commenting with: ' + replytext).green);
		var post = posted_array.shift();
		r.getSubmission(post).reply(replytext);
		scriptstatus.canpost = false;
		CanPost = setInterval(function(){ scriptstatus.canpost = true }, 11*60*1000);
	}
}


function fn_addMusic(para_number:number):string {
	var musicNotes = ["♩","♪","♫","♬"]; //Ѫ
	var output:string = "";
	for (var index = 0; index < Math.ceil(Math.random() * para_number); index++) {
		output += musicNotes[Math.floor(Math.random() * musicNotes.length)];
	}
	return output;
}


function fn_InStr(para_String, para_needle):boolean {
	var Output = para_String.indexOf(para_needle);
	if (Output === -1) {
		return false;
	} else {
		return true;
	}
}


function fn_TitleCase(string):string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
