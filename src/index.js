var express = require('express');
var bodyParser = require('body-parser');
var envs = require('envs');
var logger = require('morgan');
var request = require('request-json');
var fs = require('fs');

var app = express();

var debug = envs('DEBUG');
var opsGenieApiKey = envs('OPSGENIE_APIKEY');
var lkBoardId = envs('LK_BOARD_ID');
var lkCreateLaneId = envs('LK_CREATE_LANE_ID');
var lkCloseLaneId = envs('LK_CLOSE_LANE_ID');
var lkCardTypeId = envs('LK_CARD_TYPE_ID');
var lkCardPriorityId = envs('LK_CARD_PRIORITY_ID', 2);
var lkUser = envs('LK_USER');
var lkPass = envs('LK_PASS');
var lkOrg = envs('LK_ORG');
var lkDomain = envs('LK_DOMAIN', 'leankit.com');
var listenIp = envs('LISTEN_IP', '0.0.0.0');
var listenPort = envs('LISTEN_PORT', 8000);
var lkUrl = 'https://' + lkOrg + '.' + lkDomain + '/';

var jsonParser = bodyParser.json();

// Custom Log token to output extended results
logger.token('result', function getResult(req) {
  return req.result;
});

// rewrite remote-addr with X-Forwared-For if it exists
app.use(rewriteIp);
app.use(logger(':date[iso] :remote-addr ":method :url HTTP/:http-version" :status ":result"'));

app.post('/', jsonParser, function (req, res) {
  // require application/json
  if(!req.is('application/json')) {
    req.result = 'Invalid Content-Type: ' + req.get('Content-Type');
    return res.sendStatus(406);
  }
  // We require an API key
  if (req.query.apikey != opsGenieApiKey) {
    req.result = 'Invalid API Key';
    return res.sendStatus(403);
  }

  if (debug) console.log('Request Body:');
  if (debug) console.log(JSON.stringify(req.body, null, 2));

  // Create or Move Card to Done based on action
  switch (req.body.action) {
    case 'Create':
      createCard(req, res);
      break;
    case 'Close':
      closeCard(req, res);
      break;
    default:
      req.result = 'Invalid Action';
      res.sendStatus(400);
  }
});

var server = app.listen(listenPort, listenIp, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Settings');
  console.log('------------');
  console.log('OPSGENIE_APIKEY: %s', opsGenieApiKey);
  console.log('LK_ORG: %s', lkOrg);
  console.log('LK_DOMAIN: %s', lkDomain);
  console.log('LK_BOARD_ID: %s', lkBoardId);
  console.log('LK_CREATE_LANE_ID: %s', lkCreateLaneId);
  console.log('LK_CLOSE_LANE_ID: %s', lkCloseLaneId);
  console.log('LK_CARD_TYPE_ID: %s', lkCardTypeId);
  console.log('LK_CARD_PRIORITY_ID: %s', lkCardPriorityId);
  console.log('LK_USER: %s', lkUser);
  if (debug) console.log('LK_PASS: %s', lkPass);
  console.log('------------');
  console.log('OpsGenie-2-LeanKit listening at http://%s:%s', host, port);
});

function createCard (req, res) {
  var alertUrl = 'http://opsg.in/i/' + req.body.alert.tinyId;
  var alertId = req.body.alert.alertId;
  var path = 'kanban/api/board/' + lkBoardId + '/AddCards?wipOverrideComment=Alert';
  var data = [
    {
      "LaneId": lkCreateLaneId,
      "Index": 0,
      "Title": req.body.alert.message,
      "Description": "",
      "TypeId": lkCardTypeId,
      "Priority": lkCardPriorityId,
      "ExternalSystemName": "OpsGenie",
      "ExternalSystemUrl": alertUrl,
      "ExternalCardID": "OpsGenie"
    }
  ];

  var client = request.createClient(lkUrl);
  client.setBasicAuth(lkUser, lkPass);
  client.post(path, data, function (err, reslt, body) {
    if (debug) console.log('Sending to: %s%s', lkUrl, path);
    if (debug) console.log(JSON.stringify(body, null, 2));
    if (body.ReplyText == 'The Cards were successfully added.') {
      //save alert id to card id
      var alertState = {
        "status": "Create",
        "card": body.ReplyData[0][0].Id
      };
      var f = '/tmp/' + alertId + '.json';
      fs.writeFile(f, JSON.stringify(alertState, null, 2), function(err) {
        if(err) {
          console.log(err);
        } else {
          if (debug) console.log("%s was saved", f);
        }
      });
      req.result = 'Card Created: ' + body.ReplyData[0][0].Id;
      res.sendStatus(200);
    } else {
      req.result = 'ERROR: ' + body.ReplyText;
      res.sendStatus(500);
    }
  });
}

function closeCard (req, res) {
  var alertId = req.body.alert.alertId;
  var f = '/tmp/' + alertId + '.json';
  var alertState = JSON.parse(fs.readFileSync(f, 'utf8'));
  var data = {};
  var path = 'kanban/api/board/' + lkBoardId + '/MoveCard/' + alertState.card + '/lane/' + lkCloseLaneId + '/position/0' +  '?wipOverrideComment=Alert';

  var client = request.createClient(lkUrl);
  client.setBasicAuth(lkUser, lkPass);
  client.post(path, data, function (err, reslt, body) {
    if (debug) console.log('Sending to: %s%s', lkUrl, path);
    if (debug) console.log(JSON.stringify(body, null, 2));
    if (body.ReplyText == 'The Card was moved successfully.') {
      fs.unlink(f, function (err) {
        if (err) console.log(err);
      });
      req.result = 'Card Moved to Closed: ' + alertState.card;
      res.sendStatus(200);
    } else {
      req.result = 'ERROR: ' + body.ReplyText;
      res.sendStatus(500);
    }
  });
}

function rewriteIp(req, res, next) {
  if (req.ips[0]) {
    req.ip = req.ips[0];
  }
  next();
}
