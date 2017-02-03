/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/
This is a sample Slack Button application that adds a bot to one or many slack teams.
# RUN THE APP:
  Create a Slack app. Make sure to configure the bot user!
    -> https://api.slack.com/applications/new
    -> Add the Redirect URI: http://localhost:3000/oauth
  Run your bot from the command line:
    clientId=<my client id> clientSecret=<my client secret> port=3000 node slackbutton_bot_interactivemsg.js
# USE THE APP
  Add the app to your Slack by visiting the login page:
    -> http://localhost:3000/login
  After you've added the app, try talking to your bot!
# EXTEND THE APP:
  Botkit has many features for building cool and useful bots!
  Read all about it here:
    -> http://howdy.ai/botkit
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
var Botkit = require('Botkit');

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
)

controller.setupWebserver(process.env.PORT,function(err,webserver) {
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

function randomColor() {
	return '#'+Math.floor(Math.random()*16777215).toString(16)
}

function buildHelpCenterReply(team) {
	var reply = {
		text: 'Here is your help center naughty mortal. Say `add <title> > <description>` to add articles.',
		attachments: [],
	}

	for (var x = 0; x < team.list.length; x++) {
		reply.attachments.push({
			title: team.list[x].title,
			callback_id: team.id + '-' + team.list[x].id,
			attachment_type: 'default',
			color: randomColor(),
			fields: [
				{
					value: team.list[x].description
				}
			],
			actions: [
				{
					"name": "more",
					"text": ":heavy_plus_sign: More",
					"value": "more",
					"type": "button",
				},
				{
					"name": "delete",
					"text": ":x: Delete",
					"value": "delete",
					"style": "danger",
					"type": "button",
					"confirm": {
						"title": "Are you sure?",
						"text": "This will delete this part.",
						"ok_text": "Yes",
						"dismiss_text": "No"
					}
				}
			]
		})
	}

	return reply
}

function buildDetailReply(team, article) {
	var reply = {
		text: 'You can consult and edit this article',
		attachments: [{
			title: article.title,
			callback_id: team.id + '-' + article.id,
			attachment_type: 'default',
			color: randomColor(),
			fields: [
				{
					value: article.description
				},
				{
					title: 'Content',
					value: (article.content) ? article.content : 'This article has no content yet, click `edit` to add some'
				}
			],
			actions: [
				{
					"name": "editTitle",
					"text": "Edit title",
					"value": "editTitle",
					"type": "button",
				},
				{
					"name": "editShortDescription",
					"text": "Edit short description",
					"value": "editShortDescription",
					"type": "button",
				},
				{
					"name": "editContent",
					"text": "Edit content",
					"value": "editContent",
					"type": "button",
				}
			]
		}],
	}

	return reply
}

controller.on('interactive_message_callback', function(bot, message) {
	console.log("lkkl,")
	var ids = message.callback_id.split(/\-/);
	var team_id = ids[0];
	var article_id = ids[1];

	controller.storage.teams.get(team_id, function(err, team) {
		var team = team
		if (!team) {
			team = {
				id: team_id,
				list: []
			}
		}

		for (var x = 0; x < team.list.length; x++) {
			if (team.list[x].id == article_id) {
				var action = message.actions[0].value
				switch (action) {
					case 'more':
						bot.reply(message, buildDetailReply(team, team.list[x]))
						break
					case 'delete':
						team.list.splice(x,1);
						bot.replyInteractive(message, buildHelpCenterReply(team))
						controller.storage.teams.save(team)
						break
					case 'editTitle':
					case 'editShortDescription':
					case 'editContent':
						var element
						if (action === 'editTitle') { element = 'title' }
						else if (action === 'editShortDescription') { element = 'short description' }
						else if (action === 'editContent') { element = 'content' }

						bot.startConversation(message, function(err, convo) {
							var question = 'Tell me what the new *' + element + '* should be.' +
							'\nYou only have to write it down for me please or say `cancel` if you\'ve changed your mind.'

							var index = x
							convo.ask(question, function(response, convo) {
								if (response.text === 'cancel') {
									convo.say('OK I\'m not editing anything')
									convo.next()
									return
								}

								if (action === 'editTitle') { team.list[index].title = response.text }
								else if (action === 'editShortDescription') { team.list[index].description = response.text}
								else if (action === 'editContent') { team.list[index].content = response.text }

								convo.say('The ' + element + ' has been updated. You can check it out :arrow_down:')
								convo.say(buildDetailReply(team, team.list[index]))
								convo.next()
								controller.storage.teams.save(team)
							})
						})
					break
					default:
						break
				}
			}
		}
	})
})

controller.hears(['add (.*)'],'direct_mention,direct_message',function(bot,message) {
	var content = message.match[1]
	var contentSplit = content.split('&gt;')
	console.log(content, contentSplit)

	// Handle formatting errors
	if (contentSplit.length < 2) {
		bot.reply(message,
			'For adding new entries, use the following format : `add <title> > <description>`' +
			'\n For instance : `add Guitar > This makes music...`')
		return
	} else if (contentSplit.length > 2) {
		bot.reply(message, 'You cannot use the symbol `>` more than once.' +
			'\n\nFor adding new entries, use the following format : `add <title> > <description>`' +
			'\n For instance : `add Guitar > This makes music...`')
		return
	}

	controller.storage.teams.get(message.team, function(err, team) {
		if (!team) {
			team = {
				id: message.team,
				list: []
			}
		}

		if (!team.list) {
			team.list = []
		}

		team.list.push({
			id: message.ts,
			title: contentSplit[0],
			description: contentSplit[1]
		});

		bot.reply(message,'Added to the center. Say `center` to view or manage your team help center.')

		controller.storage.teams.save(team);
	});
});


controller.hears('center', 'direct_mention,direct_message',function(bot,message) {
  controller.storage.teams.get(message.team, function(err, team) {

      if (!team) {
          team = {
              id: message.team,
              list: []
          }
      }

      if (!team.list || !team.list.length) {
				bot.reply(message, 'The center is empty. Say `add <article>` to add articles.')
				return
      }

      bot.reply(message, buildHelpCenterReply(team))
      controller.storage.teams.save(team)
  });
});

/******************* CONNECTION RELATED EVENTS *******************/
// just a simple way to make sure we don't
// connect to the RTM twice for the same team
var _bots = {};
function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

controller.on('create_bot',function(bot,config) {
	if (_bots[bot.config.token]) {
		// already online! do nothing.
	} else {
		bot.startRTM(function(err) {

			if (!err) {
				trackBot(bot);
			}

			bot.startPrivateConversation({user: config.createdBy},function(err,convo) {
				if (err) {
					console.log(err);
				} else {
					convo.say('I am a bot that has just joined your team');
					convo.say('You must now /invite me to a channel so that I can be of use!');
				}
			})
		});
	}
});

// Handle events related to the websocket connection to Slack
controller.on('rtm_open',function(bot) {
	console.log('** The RTM api just connected!');
});

controller.on('rtm_close',function(bot) {
	console.log('** The RTM api just closed');
	// you may want to attempt to re-open
});


controller.storage.teams.all(function(err,teams) {
  if (err) {
    throw new Error(err);
  }

  // connect all teams with bots up to slack!
  for (var t  in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM(function(err, bot) {
        if (err) {
          console.log('Error connecting bot to Slack:',err);
        } else {
          trackBot(bot);
        }
      });
    }
  }
});
