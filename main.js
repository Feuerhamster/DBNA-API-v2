/*
* DBNA API (Unofficial)
* Original owner of resources: dbna GmbH
* REST-API Owner: dbna GmbH
* Implementation by: Feuerhamster (HamsterLabs.de)
*
* WARNING: DO NOT USE THIS LIBRARY / API FOR BAD INTENTIONS!!!
*/

class dbnaAPI{

    constructor() {

        this.socket = require('./socket.js');
        this.request = require('request');

        const events = require('events');
        this.eventEmitter = new events.EventEmitter();

        this.chatClient = null;

        this.endpoint = "https://www.dbna.com/json/";
        this.wsEndpoint = "wss://www.dbna.com/chat-server/socket.io/?EIO=3&transport=websocket";

        // temporary data that is required in runtime
        // Mostly used for pagination
        this.tempData = {
            pulse: {},
            contacts: {},
            sessionCookie: ""
        };

        this.types = {
            crushes: {
                HEART: 11,
                FLAME: 12,
                THUMBUP: 14,
                LOLLIE: 15,
                SUPER: 99
            },
            crush: {
                LOVE: 11,
                HOT: 12,
                GOOD: 14,
                CUTE: 15,
                SUPER: 99
            }
        }

    }

    /*
    * Authentication and login
    */

    login(username, password, auto = 0){

        return new Promise((resolve, reject)=>{

            this.request(this.endpoint + 'user/login', {
                method: "POST",
                form: {
                    username: username,
                    password: password,
                    auto: auto
                },
                json: true,
                jar: true
            }, (err, res, body)=>{

                if(body.error){
                    reject(body.error);
                }else{
                    this.tempData.sessionCookie = res.headers["set-cookie"].find(x => x.startsWith("cdsess"));
                    resolve(body);
                }

            });

        });

    }

    logout(callback){

        this.request(this.endpoint + 'user/logout', {
            method: "GET",
            json: true,
            jar: true
        }, (err, res, body)=>{

            if(body.error){
                callback(body.error, null);
            }else{
                callback(null, body);
            }

        });

    }

    /*
    * Users, Contacts and pictures
    */

    user(id){

        return {
            getProfile: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'profile/' + id, {
                        method: "GET",
                        json: true,
                        jar: true,
                        qs: { gallery: 1 }
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
            pulse: () => this.pulse(id),
            chat: () => this.chat(id),
            pictures: (galleryId = 'default') => this.pictures(id),
            contacts: (all = false) => this.contacts(id, all),
            sendCrush: (crush) => {

                this.request(this.endpoint + 'profile/' + id + '/crush/' + crush, {
                    method: "PUT",
                    json: true,
                    jar: true
                }, (err, res, body)=>{});

            },
            revokeCrush: () => {

                this.request(this.endpoint + 'profile/' + id + '/crush', {
                    method: "DELETE",
                    json: true,
                    jar: true
                }, (err, res, body)=>{});

            }
        };

    }

    contacts(userId, all = false){

        return {
            getCurrent: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'profile/' + userId + '/friends', {
                        method: "GET",
                        json: true,
                        jar: true,
                        qs: { type: all ? 'all' : 'friends' }
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{

                            this.tempData.contacts[userId] = 0;

                            resolve(body);

                        }

                    });

                });

            },
            getNextPage: ()=>{

                return new Promise((resolve, reject)=>{

                    this.tempData.contacts[userId]++;

                    this.request(this.endpoint + 'profile/' + userId + '/friends', {
                        method: "GET",
                        json: true,
                        jar: true,
                        qs: { page: this.tempData.contacts[userId], type: all ? 'all' : 'friends' }
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
        }

    }

    pictures(userId){

        return {

            getGalleries: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'profile/' + userId + '/picture', {
                        method: "GET",
                        json: true,
                        jar: true,
                        qs: {galleries: 1}
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
            getGallery: (galleryId = 'default')=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'profile/' + userId + '/gallery/' + galleryId, {
                        method: "GET",
                        json: true,
                        jar: true
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            }

        }

    }

    picture(id){

        return {
            getPicture: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'profile/picture/' + id, {
                        method: "GET",
                        json: true,
                        jar: true,
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
            heart: ()=> this.heart("picture", id),
            comments: (commentId = null) => this.comments("picture", id, commentId)
        }

    }

    /*
    * Posts and Content management
    */

    pulse(id = "all"){

        return {
            getCurrent: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'pulse/' + id, {
                        method: "GET",
                        json: true,
                        jar: true
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{

                            this.tempData.pulse[id] = {
                                lastEntryDate: body.stories[body.stories.length-1].date,
                                lastPage: 0
                            };

                            resolve(body);

                        }

                    });

                });

            },
            getNextPage: ()=>{

                return new Promise((resolve, reject)=>{

                    this.tempData.pulse[id].lastPage ++;

                    this.request(this.endpoint + 'pulse/all', {
                        method: "GET",
                        json: true,
                        jar: true,
                        qs: { before: this.tempData.pulse[id].lastEntryDate, ph: this.tempData.pulse[id].lastPage }
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{

                            this.tempData.pulse[id] = {
                                lastEntryDate: body.stories[body.stories.length-1].date,
                                lastPage: this.tempData.pulse[id].lastPage
                            };

                            resolve(body);
                        }

                    });

                });

            },
        }

    }

    story(id){

        return {
            getStory: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(this.endpoint + 'story/' + id, {
                        method: "GET",
                        json: true,
                        jar: true
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
            heart: () => this.heart("story", id),
            comments: (commentId = null) => this.comments("story", id, commentId)
        }

    }

    comments(target, id, commentId = null){
        return{
            get: ()=>{

                return new Promise((resolve, reject)=>{

                    this.request(`${this.endpoint}comments/${target}/${id}`, {
                        method: "GET",
                        json: true,
                        jar: true,
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });
                
            },
            post: (text)=>{

                return new Promise((resolve, reject)=>{

                    this.request(`${this.endpoint}comments/${target}/${id}`, {
                        method: "POST",
                        form: {
                            body: text
                        },
                        json: true,
                        jar: true
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
            delete: (commentId)=>{

                return new Promise((resolve, reject)=>{

                    this.request(`${this.endpoint}comments/${target}/${commentId}`, {
                        method: "DELETE",
                        json: true,
                        jar: true
                    }, (err, res, body)=>{

                        if(body.error){
                            reject(body.error);
                        }else{
                            resolve(body);
                        }

                    });

                });

            },
            heart: ()=> this.heart(target, commentId)
        }
    }

    heart(target, id){

        return new Promise((resolve, reject)=>{

            this.request(`${this.endpoint}heart/${target}/${id}`, {
                method: "GET",
                json: true,
                jar: true
            }, (err, res, body)=>{

                if(body.error){
                    reject(body.error);
                }else{
                    resolve(body);
                }

            });

        });

    }

    /*
    * Chats and messages
    */

    startChatClient(){

        this.chatClient = this.socket(this.wsEndpoint, { headers: { "Cookie": this.tempData.sessionCookie } });

        this.chatClient.on('open', () => {
            this.eventEmitter.emit('connected');
        });

        this.chatClient.on('error', (error) => {
            this.eventEmitter.emit('error', error);
        });

        //triggers when the user gets a chat message
        this.chatClient.on('message', (msg)=>{

            let messageObject = {
                message: msg,
                actions: this.messageActions(msg.id),
                chat: this.chat(msg.sender)
            };

            this.eventEmitter.emit('message', messageObject);

        });

    }

    chats(){

        return new Promise((resolve, reject)=>{

            if(this.chatClient.ws.readyState === 1){

                this.chatClient.send('peers', {}, (data)=>{
                    resolve(data);
                });

            }else{
                reject({ error: 'no_connection' });
            }

        });

    }

    chat(peer){

        return {

            send: (message)=>{

                return new Promise((resolve, reject)=>{

                    if(this.chatClient.ws.readyState === 1){

                        this.chatClient.send('message', { receiver: peer, message: message }, (data)=>{
                            resolve(data);
                        });

                    }else{
                        reject({ error: 'no_connection' });
                    }


                });

            },

            get: (limit = 30, thumb = false)=>{

                return new Promise((resolve, reject)=>{

                    if(this.chatClient.ws.readyState === 1){

                        this.chatClient.send('history', { peer: peer, limit: limit, thumb: thumb }, (data)=>{
                            resolve(data);
                        });

                    }else{
                        reject({ error: 'no_connection' });
                    }

                });

            },

            typing: (typing = true)=>{

                if(typing){
                    this.chatClient.send('typing', { peer: peer });
                }else {
                    this.chatClient.send('nottyping', {peer: peer});
                }

            }

        }

    }

    messageActions(id){

        return {
            read: ()=>{
                this.chatClient.send('read', { id: id });
            },
            delete: ()=>{
                this.chatClient.send('delete', { id: id });
            },
            archive: ()=>{
                this.chatClient.send('archive', { id: id });
            },
            unarchive: ()=>{
                this.chatClient.send('unarchive', { id: id });
            }
        }

    }

    /*
    * Event registration
    */
    on(event, func){
        this.eventEmitter.on(event, func);
    }

}

//export class
module.exports = dbnaAPI;