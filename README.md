# opsgenie2lk
Simple nodejs service to create LeanKit cards from OpsGenie alerts.

### What I Do
* Create a Card when OpsGenie creates an alert.
* Move a Card to your Close Lane when the alert is closed.

### Docker
This is available as a Docker Image:
```
docker run -d \
-p 8000:8000 \
-e OPSGENIE_APIKEY=65c3859e-d8f5-4138-be52-f0acdbf55929 \
-e LK_ORG=myorg \
-e LK_BOARD_ID=307000917 \
-e LK_CREATE_LANE_ID=307000784 \
-e LK_CLOSE_LANE_ID=307000740 \
-e LK_CARD_TYPE_ID=307001128 \
-e LK_USER=jgreat@jgreat.me \
-e LK_PASS=******** \
jgreat/opsgenie2lk
```

### Setup
#### Server
This doesn't provide any provision for SSL/TLS. Although not required I suggest that you run this behind a Load Balancer or Proxy that provides SSL Termination.  

**Required Environment Vars**  
`OPSGENIE_APIKEY` - This can be anything but I suggest a nice random UUID. You can generate one here:  https://www.uuidgenerator.net/  

`LK_ORG` - The organization name for LeanKit. The first part of the url you use to access LeanKit. **myorg**.leankit.com  

`LK_USER` - Your LeanKit user email address.  

`LK_PASS` - Your LeanKit password.  

`LK_BOARD_ID` - The ID of the Board you want to create cards on. You can find this in the URL for the board.  myorg.leankit.com/Boards/View/**307980917**  

`LK_CREATE_LANE_ID` - The Id of the Lane you want to create the cards in.  My create lane is in `operations workflow:fires/remediate`. You can find this by making a LeanKit [GetBoardIdentifiers](#GetBoardIdentifiers-Query) API query.  

`LK_CLOSE_LANE_ID` - This is the Id of the Lane that the card will be moved to when OpsGenie sends the `Closed` webhook. My closed lane is `finished:finished as planned`. You can find this by making a LeanKit [GetBoardIdentifiers](#GetBoardIdentifiers-Query) API query.  

`LK_CARD_TYPE_ID` - This is the Id of the Card Type. We have a `Fires` card type. You can find this by making a LeanKit [GetBoardIdentifiers](#GetBoardIdentifiers-Query) API query.  

**Optional Environment Vars**  
`LK_CARD_PRIORITY_ID` - The Priority Id of the Card. Defaults to `2`.You can find this by making a LeanKit [GetBoardIdentifiers](#GetBoardIdentifiers-Query) API query.  

`LK_DOMAIN` - Alternate domain name. Defaults to `leankit.com` you probably don't need to set this.  

`LISTEN_IP` - Set the Server Listen IP. Defaults to `0.0.0.0`  

`LISTEN_PORT` - Set the Server Listen Port. Defaults to `8000`  

#### OpsGenie
You will need to set up a Webhook Integration on OpsGenie. https://www.opsgenie.com/docs/integrations/webhook-integration  

The Webhook URL should point to your server and specify the apikey as a query option.
```
http://<your.ip>:8000/?apikey=65c3859e-d8f5-4138-be52-f0acdbf55929
```

### GetBoardIdentifiers Query
Here is a curl example of how to get the Lane and Card Type Ids for the Server setup.  

This produces a lot of json. I've truncated the extra sections for this example. I'm piping this through `json_pp` for pretty output.
```
$ curl -s -u 'jgreat@jgreat.me:<password>' -H 'Content-Type: application/json' -X GET https://myorg.leankit.com/kanban/api/board/307000917/GetBoardIdentifiers | json_pp
{
  "ReplyData" : [
    {
      "LaneType" : [
        ...
      ],
      "LaneClassType" : [
      ],
      "CardTypes" : [
        ...
        {
          "Name" : "Fire",
          "IsDefaultTaskType" : false,
          "IsTaskType" : false,
          "Id" : 307001128,
          "IsCardType" : true,
          "IsDefault" : false
        },
        ...
      ],
      "Lanes" : [
        ...
        {
          "Index" : 0,
          "LaneType" : 3,
          "ClassType" : 0,
          "Name" : "finished:finished as planned",
          "Type" : 0,
          "Id" : 307000740,
          "LaneClassType" : 2,
          "ActivityId" : null,
          "TopLevelParentLaneId" : 307980737,
          "IsDefaultDropLane" : false,
          "CardLimit" : 0,
          "ParentLaneId" : 307980737
        },
        {
           "IsDefaultDropLane" : false,
           "ActivityId" : null,
           "TopLevelParentLaneId" : 307980741,
           "CardLimit" : 0,
           "ParentLaneId" : 307000782,
           "Name" : "operations workflow:fires/remediate",
           "LaneType" : 2,
           "Index" : 4,
           "ClassType" : 0,
           "LaneClassType" : 0,
           "Type" : 0,
           "Id" : 307980784
        },
        ...
      ],
      "BoardId" : 307000917,
      "ClassesOfService" : [
        ...
      ],
      "Priorities" : [
        {
          "Name" : "Critical",
          "Id" : 3
        },
        {
          "Name" : "High",
          "Id" : 2
        },
        {
          "Name" : "Normal",
          "Id" : 1
        },
        {
          "Name" : "Low",
          "Id" : 0
        }
      ],
      "BoardUsers" : [
        ...  
      ],
      "BoardStatistics" : null
    }
  ],
  "ReplyText" : "The Board Identifiers were retrieved successfully.",
  "ReplyCode" : 200
}
```

#### Disclaimer
Sigh, you know the drill. Use at your own risk, YMMV...
