/*
Socket.IO Message parser

Example:

    Message: 4251["unread",{}]

    First digit:        Type (0 = open; 1 = close; 2 = ping; 3 = pong; 4 = message)
    Second digit:       Request or answer? (2 = requested; 3 = answer to request)
    Folowing digits:    Counter that counts every message 1 higher

*/

// define the types
const packetTypes = {
    0: "open",
    1: "close",
    2: "ping",
    3: "pong",
    4: "message"
};

//Second digit: Outgoing request or incoming answer?
const types = {
    2: "event",
    3: "acknowledgement",
    4: "error"
};

/*
regular expression for matching the single digits and the other values
*/
const dataRegex = /^(?<packetType>\d)(?<type>\d)(?<id>\d*)\["?(?<event>\w+)"?,(?<data>.+)]$/im;
const alternativeRegex = /^(?<packetType>\d)(?<type>\d)?(?<data>.+)?$/im;

//export the function that builds a message object
module.exports.parseMessage = function(msgString){

    //execute regex on message
    let result = dataRegex.exec(msgString);
    let alternativeResult = alternativeRegex.exec(msgString);

    //create message object
    let msgObject = {
        packetType: null,
        type: null,
        id: null,
        event: null,
        data: null
    };

    if(result){

        msgObject = {
            packetType: packetTypes[result.groups.packetType] ? packetTypes[result.groups.packetType] : null,
            type: types[result.groups.type] ? types[result.groups.type] : null,
            id: result.groups.id ? result.groups.id : null,
            event: result.groups.event !== "null" ? result.groups.event : null,
            data: JSON.parse(result.groups.data)
        };

    }else if(alternativeResult){
        msgObject.packetType = packetTypes[alternativeResult.groups.packetType];

        if(alternativeResult.groups.type){
            msgObject.type = types[alternativeResult.groups.type];
        }

        if(alternativeResult.groups.data){
            msgObject.data = JSON.parse(alternativeResult.groups.data);
        }
    }

    //return the message object
    return msgObject;

};

//exports the function that serialize the
module.exports.stringifyMessage = function(msgObject){

    //check if the message object is valid
    if(Number.isInteger(msgObject.id) && msgObject.event && msgObject.data){

        //build the message
        return `${ 4 }${ 2 }${ msgObject.id }["${ msgObject.event }",${ JSON.stringify(msgObject.data) }]`;

    }else{
        //throw error
        throw new TypeError("Message object ist not valid");
    }

};