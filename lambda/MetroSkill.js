'use strict';
var http = require('http');

const METRO_API_HOST = "svc.metrotransit.org";
const METRO_API_PATH = "/nextrip/902/";
const METRO_API_ARGS = "?format=json";
const STATION_CODES = {
  "TargetField":{"e":"TF12","w":"TF11"},
  "WarehouseDistrict":{"e":"WAR2","w":"WAR1"},
  "NicolletMall":{"e":"5SNI","w":"5SNI"},
  "GovernmentPlaza":{"e":"GOVT","w":"GOVT"},
  "USBankStadium":{"e":"USB2","w":"USB1"},
  "WestBank":{"e":"WEBK","w":"WEBK"},
  "EastBank":{"e":"EABK","w":"EABK"},
  "StadiumVillage":{"e":"STVI","w":"STVI"},
  "ProspectPark":{"e":"PSPK","w":"PSPK"},
  "Westgate":{"e":"WGAT","w":"WGAT"},
  "Raymond":{"e":"RAST","w":"RAST"},
  "Fairview":{"e":"FAUN","w":"FAUN"},
  "Snelling":{"e":"SNUN","w":"SNUN"},
  "Hamline":{"e":"HMUN","w":"HMUN"},
  "Lexington":{"e":"LXUN","w":"LXUN"},
  "Victoria":{"e":"VIUN","w":"VIUN"},
  "Dale":{"e":"UNDA","w":"UNDA"},
  "Western":{"e":"WEUN","w":"WEUN"},
  "CapitolRice":{"e":"UNRI","w":"UNRI"},
  "Robert":{"e":"ROST","w":"ROST"},
  "Tenth":{"e":"10CE","w":"10CE"},
  "Central":{"e":"CNST","w":"CNST"},
  "UnionDepot":{"e":"UNDP","w":"UNDP"}
};


// --------------- Helpers that build all of the responses -----------------------
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `${title}`,
            content: `${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Metro';
    const speechOutput = 'Ask Me which station you would like the train times for.';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me the name of a green line station.';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function httpGet(direction, station, callback) {

    return http.get({
        host: METRO_API_HOST,
        path: METRO_API_PATH + direction + "/" + station + METRO_API_ARGS
    }, function(response) {
        // Continuously update stream with data
        var body = '';
        response.on('data', function(d) {
            body += d;
        });
        response.on('end', function() {

            // Data reception is done, do whatever with it!
            var parsed = JSON.parse(body);
            callback(parsed);
        });
    });

}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Metro Session Ended';
    const speechOutput = 'Thank You for using Metro';
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function getStationName(station){
    switch(station.toLowerCase()) {
        case "target field":
            return "TargetField";
        case "warehouse district":
            return "WarehouseDistrict";
        case "hennepin avenue":
            return "WarehouseDistrict";
        case "stadium village":
            return "StadiumVillage";
        case "prospect park":
            return "ProspectPark";
        case "u.s. bank stadium":
            return "USBankStadium";
        case "west gate":
            return "Westgate";
        case "nicollet mall":
            return "NicolletMall";
        case "government plaza":
            return "GovernmentPlaza";
        case "west bank":
            return "WestBank";
        case "east bank":
            return "EastBank";
        case "raymond":
            return "Raymond";
        case "fairview":
            return "Fairview";
        case "hamline":
            return "Hamline";
        case "lexington":
            return "Lexington";
        case "victoria":
            return "Victoria";
        case "dale":
            return "Dale";
        case "western avenue":
            return "Western";
        case "capitol rice":
            return "CapitolRice";
        case "robert street":
            return "Robert";
        case "tenth street":
            return "Tenth";
        case "central":
            return "Central";
        case "union depot":
            return "UnionDepot";
        default:
            return "";
    }
}

function getNextTrains(intent, session, callback) {
    var cardTitle = "Train Times - ";
    const Station = intent.slots.Station;

    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = true;
    let speechOutput = '';

    if (Station) {
        const stationName = getStationName(Station.value);
        cardTitle = cardTitle + Station.value;
        var eastStation = STATION_CODES[stationName].e;
        var westStation = STATION_CODES[stationName].w;

        var eastPromise = new Promise(function(resolve, reject){
          var apiResult = httpGet(2, eastStation, function(jsonResult){
            if(jsonResult.length === 0){
              reject([]);
            }

            if(jsonResult.length <= 2){
              resolve(jsonResult);
            } else {
              resolve(jsonResult.slice(0,2));
            }
          });
        });

        var westPromise = new Promise(function(resolve, reject){
          var apiResult = httpGet(3, westStation, function(jsonResult){
            if(jsonResult.length === 0){
              reject([]);
            }

            if(jsonResult.length <= 2){
              resolve(jsonResult);
            } else {
              resolve(jsonResult.slice(0,2));
            }
          });
        });

        Promise.all([eastPromise, westPromise]).then(function(nextTrains){
          console.log(JSON.stringify(nextTrains));

          var eastboundMessage = "The Next eastbound trains for the " + Station.value + " Station is ";
          if(nextTrains[0][0].DepartureText.toLowerCase().includes("min")){
              eastboundMessage = eastboundMessage + "in " + nextTrains[0][0].DepartureText.toLowerCase().replace("min", "minutes") + " ";
          } else {
              eastboundMessage = eastboundMessage + "at " + nextTrains[0][0].DepartureText.toLowerCase() + " ";
          }

          eastboundMessage = eastboundMessage + "and ";

          if(nextTrains[0][1].DepartureText.toLowerCase().includes("min")){
              eastboundMessage = eastboundMessage + "in " + nextTrains[0][1].DepartureText.toLowerCase().replace("min", "minutes") + ". ";
          } else {
              eastboundMessage = eastboundMessage + "at " + nextTrains[0][1].DepartureText.toLowerCase() + ". ";
          }


          var westboundMessage = "The Next westbound trains for the " + Station.value + " Station is ";

          if(nextTrains[1][0].DepartureText.toLowerCase().includes("min")){
              westboundMessage = westboundMessage + "in " + nextTrains[1][0].DepartureText.toLowerCase().replace("min", "minutes") + " ";
          } else {
              westboundMessage = westboundMessage + "at " + nextTrains[1][0].DepartureText.toLowerCase() + " ";
          }

          westboundMessage = westboundMessage + "and ";

          if(nextTrains[1][1].DepartureText.toLowerCase().includes("min")){
              westboundMessage = westboundMessage + "in " + nextTrains[1][1].DepartureText.toLowerCase().replace("min", "minutes") + ". ";
          } else {
              westboundMessage = westboundMessage + "at " + nextTrains[1][1].DepartureText.toLowerCase() + ".";
          }

          speechOutput = eastboundMessage + westboundMessage;
          repromptText = null;
          callback({},
              buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

        });

    } else {
        speechOutput = "I don't recognize that station. Please try again.";
        repromptText = "Please tell me the name of a green line station.";
        callback({},
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'TrainQuery') {
        getNextTrains(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);
        console.log(JSON.stringify(event));
        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
