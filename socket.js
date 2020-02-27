//import modules
const WebSocket = require("ws");
const socketIOParser = require("./socket.io-parser.js");

//set configuration variables
let idCount = 0;
let pingInterval = 25000;
let reconnectTimeout = 5000;
let reconnectAttemps = 5;
let reconnections = 0;

const ackQueue = {};
const events = {};

let ws = null;

function socket(wsurl, options){

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
            // set reconnections to 0 on successful connection
            reconnections = 0;

            setTimeout(()=>{
                if(ws.readyState == 1){
                    ws.send("2");
                }
            }, pingInterval);

        }else if(msg.packetType === "pong"){

            setTimeout(()=>{
                if(ws.readyState === 1) {
                    ws.send("2");
                }
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
    // run error event on websocket error
    ws.on("error", (err)=>{
        if(typeof events["error"] == "function"){
            events["error"](err);
        }else{
            throw err;
        }
    });

    ws.on("close", ()=>{
        // run close event
        if(typeof events["closed"] == "function"){
            events["closed"]();
        }

        // reconnect
        setTimeout(()=>{
            if(reconnections <= reconnectAttemps){
                // run reconnect event
                if(typeof events["reconnect"] == "function"){
                    events["reconnect"](reconnections);
                }
                reconnections++;
                // restart this function to reconnect
                socket(wsurl, options);
            }
        }, reconnectTimeout);
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

            ws.send(newMessage);
        },
        ws: ws
    }

}

module.exports = socket;