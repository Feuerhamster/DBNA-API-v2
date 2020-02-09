//import modules
const WebSocket = require("ws");
const socketIOParser = require("./socket.io-parser.js");

//set configuration variables
let idCount = 0;
let pingInterval = 25000;

const ackQueue = {};
const events = {};

let ws = null;

module.exports = function(wsurl, options){

    ws = new WebSocket(wsurl, [], options);

    //listen for events
    ws.on("open", ()=>{

        if(events["open"]){
            events["open"]();
        }

    });

    ws.on("message", (msg)=>{

        //parse the incoming message
        //console.log(msg);
        msg = socketIOParser.parseMessage(msg);
        //console.log(msg);
        if(msg.packetType == "open"){

            pingInterval = msg.data.pingInterval;
            setTimeout(()=>{
                ws.send("2");
            }, pingInterval);

        }else if(msg.packetType == "pong"){

            setTimeout(()=>{
                ws.send("2");
            }, pingInterval);

        }else if(msg.packetType == "message"){

            if(msg.type == "acknowledgement" && ackQueue[msg.id.toString()]){

                ackQueue[msg.id.toString()](msg.data);
                delete ackQueue[msg.id.toString()];

            }else if(msg.type == "error"){

                if(typeof events["error"] == "function"){
                    events["error"](msg.data);
                }

            }else{
                if(events[msg.event]){
                    events[msg.event](msg.data);
                }
            }



        }
    });

    ws.on("error", (err)=>{
        if(typeof events["error"] == "function"){
            events["error"](err);
        }else{
            throw err;
        }
    });

    return {
        on: (event, func)=>{
            events[event] = func;
        },
        send: (event, data = {}, ack = false)=>{
            if(typeof(ack) == "function"){
                ackQueue[idCount] = ack;
            }

            let newMessage = socketIOParser.stringifyMessage({ id : ack === false ? '' : idCount, event: event, data: data });

            idCount++;
            console.log(newMessage);
            ws.send(newMessage);
        },
        ws: ws
    }

};