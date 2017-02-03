/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/


 This is a sample Slack Button application that provides a custom
 Slash command.

 This bot demonstrates many of the core features of Botkit:

 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 # RUN THE BOT:

 Create a Slack app. Make sure to configure at least one Slash command!

 -> https://api.slack.com/applications/new

 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.


 # EXTEND THE BOT:

 Botkit is has many features for building cool and useful bots!

 Read all about it here:

 -> http://howdy.ai/botkit

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit')

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
		console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
		process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
	var BotkitStorage = require('botkit-storage-mongo');
	config = {
		storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
	}
} else {
	config = {
		json_file_store: './db_slackbutton_slash_command/',
	}
}

var controller = Botkit.slackbot(config).configureSlackApp({
		clientId: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
		scopes: ['bot'],
	}
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
	controller
		.createHomepageEndpoint(controller.webserver)
		.createOauthEndpoints(controller.webserver, function (err, req, res) {
			if (err) {
				res.status(500).send('ERROR: ' + err)
			} else {
				res.send('Success!')
			}
		})
		.createWebhookEndpoints(controller.webserver)
})

function addCommandToList(bot, message) {
	var command = message.text.substring(4)
	var commmandSplit = command.split('>')

	// Handle formatting errors
	if (commmandSplit.length < 2) {
		bot.replyPrivate(message,
			'For adding new entries, use the following format : `/helpdevil add name of entry > description`' +
			'\n For instance : `/helpdevil add Guitar > This makes music..`')
		return
	} else if (commmandSplit.length > 2) {
		bot.replyPrivate(message, 'You cannot use the symbol `>` more than once.' +
			'\n\nFor adding new entries, use the following format : `/helpdevil add name of entry > description`' +
			'\n For instance : `/helpdevil add Guitar > This makes music..`')
		return
	}

	// Get title and description
	var title = commmandSplit[0].trim()
	var description = commmandSplit[1].trim()

	// Get team data
	controller.storage.teams.get(message.team_id, function(err, team_data) {
		var list = []
		if (typeof err === 'undefined') {
			var list = team_data.list
		}
		list.push({
			title: title,
			description: description
		})

		// Store updated list
		controller.storage.teams.save({id: message.team_id, domain: message.team_domain, list: list})
		bot.replyPrivate(message, title + ' has been added to the list.')
	})
}

function showList(bot, message) {
	controller.storage.teams.get(message.team_id, function(err, team_data) {
		var text = 'The list is empty.'
		console.log(err)
		if (!err) {
			var list = team_data.list
			var text = 'This is the list of available commands :'
			for (var i = 0; i < list.length; i++) {
				text += '\n> - ' + list[i].title + ' : ' + list[i].description
			}
			text += '\nWrite `/helpdevil ' + list[0].title + '` for instance to get help on this topic.'
		}
		bot.replyPrivate(message, text)
	})
}

controller.on('slash_command', function (bot, message) {
	switch (message.command) {
		case "/helpdevil":
			// Check token
			if (message.token !== process.env.VERIFICATION_TOKEN) return;

			if (message.text.indexOf('add') === 0) {
				addCommandToList(bot, message)
			} else if (message.text === 'list') {
				showList(bot, message)
			} else if (message.text === 'button') {
				bot.replyPrivate(message, {
        attachments:[
            {
                title: 'Do you want to interact with my buttons?',
                callback_id: '123',
                attachment_type: 'default',
                actions: [
                    {
                        "name":"yes",
                        "text": "Yes",
                        "value": "yes",
                        "type": "button",
                    },
                    {
                        "name":"no",
                        "text": "No",
                        "value": "no",
                        "type": "button",
                    }
                ]
            }
        ]
    });
			} else if (message.text === '' || message.text === 'help') {
					bot.replyPrivate(message,
					'I can tell you everything you need to know in this company you naughty mortal.' +
					'\nTry tapping `/helpdevil list` to see the list of all subjects you can get help with' +
					'\n\nYou can also add new entries like this : `/helpdevil add name of entry > description`' +
					'\nFor instance : `/helpdevil add Guitar > This makes music...`')
			} else {
				bot.replyPrivate(message, "I'm afraid I don't know how to " + message.text + " yet.")
			}
				break;
			default:
				bot.replyPrivate(message, "I'm afraid I don't know how to " + message.command + " yet.");
			}
})

// receive an interactive message, and reply with a message that will replace the original
controller.on('interactive_message_callback', function(bot, message) {
	console.log("lhjdsfmfdqsjmqdsmdfsklm")
		// check message.actions and message.callback_id to see what action to take...
		// console.log(bot, message)

})
