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

        this.socket = require("./socket.js");
        this.axios = require("axios");
        this.qs = require("querystring");

        const axiosCookieJarSupport = require("axios-cookiejar-support");
        const tough = require("tough-cookie");

        axiosCookieJarSupport.default(this.axios);
        this.cookieJar = new tough.CookieJar();

        const events = require("events");
        this.eventEmitter = new events.EventEmitter();

        this.chatClient = null;

        this.endpoint = "https://www.dbna.com/json/";
        this.wsEndpoint = "wss://www.dbna.com/chat-server/socket.io/?EIO=3&transport=websocket";

        // Axios config
        this.axios.defaults.jar = this.cookieJar;
        this.axios.defaults.withCredentials = true;
        this.axios.defaults.headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36";

        // Request interceptor for removing cookie
        this.axios.interceptors.request.use((config) => {

            this.cookieJar.store.findCookie("www.dbna.com", "/", "cdsess", (err, cookie) => {
                if(!err && cookie){
                    // Remove cookie if the last access is older than 20 minutes
                    if((new Date) - cookie.lastAccessed > (1000 * 60 * 20)){
                        this.cookieJar.store.removeCookie("www.dbna.com", "/", "cdsess", (err) => {});
                    }
                }
            });

            return config;

        }, (error) => {
            return Promise.reject(error);
        });

        // temporary data that is required in runtime
        // Mostly used for pagination
        this.tempData = {
            pulse: {},
            contacts: {},
            visitorsPage: 0,
            lastNotificationDate: "",
            sessionCookie: ""
        };

        this.accountData = null;

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
        };

    }

    /*
    * Authentication and login
    */

    login(username, password, auto = 0){

        return new Promise((resolve, reject) => {

            this.axios({
                method: "post",
                url: this.endpoint + "user/login",
                data: this.qs.stringify({
                    username,
                    password,
                    auto
                })
            }).then((res) => {

                this.tempData.sessionCookie = res.headers["set-cookie"].find((x) => x.startsWith("cdsess"));
                this.accountData = res.data;
                this.eventEmitter.emit("ready", res.data);
                resolve(res.data);

            }).catch((res) => {
                reject(res.response);
            });

        });

    }

    logout(){

        return new Promise((resolve, reject) => {

            this.axios({
                url: this.endpoint + "user/logout"
            }).then((res) => {

                resolve(res.data);

            }).catch((res) => {
                reject(res.response);
            });

        });

    }

    /*
    * Users, Contacts and pictures
    */

    user(id){

        return {
            getProfile: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "profile/" + id,
                        params: { gallery: 1 }
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            pulse: () => this.pulse(id),
            chat: () => this.chat(id),
            pictures: () => this.pictures(id),
            contacts: (all = false) => this.contacts(id, all),
            sendCrush: (crush) => {

                this.axios({
                    method: "put",
                    url: this.endpoint + "profile/" + id + "/crush/" + crush
                });

            },
            revokeCrush: () => {

                this.axios({
                    method: "delete",
                    url: this.endpoint + "profile/" + id + "/crush"
                });

            },
            texts: () => this.texts(id)
        };

    }

    contacts(userId, all = false){

        return {
            getCurrent: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "profile/" + userId + "/friends",
                        params: { type: all ? "all" : "friends" }
                    }).then((res) => {

                        this.tempData.contacts[userId] = 0;

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            getNextPage: () => {

                return new Promise((resolve, reject) => {

                    this.tempData.contacts[userId]++;

                    this.axios({
                        url: this.endpoint + "profile/" + userId + "/friends",
                        params: { page: this.tempData.contacts[userId], type: all ? "all" : "friends" }
                    }).then((res) => {

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            remove: (contactId) => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "contacts/favs/" + contactId
                    }).then((res) => {

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            }
        }

    }

    pictures(userId){

        return {

            getGalleries: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "profile/" + userId + "/picture",
                        params: { galleries: 1 }
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            getGallery: (galleryId) => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "profile/" + userId + "/gallery/" + galleryId
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            }

        }

    }

    picture(id){

        return {
            getPicture: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "profile/picture/" + id
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            heart: () => this.heart("picture", id),
            comments: (commentId = null) => this.comments("picture", id, commentId)
        }

    }

    texts(userId = null){

        return {
            getTexts: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "profile/" + userId + "/text"
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            update: (type, text) => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        method: "post",
                        url: this.endpoint + "manage/text/" + type,
                        data: this.qs.stringify({
                            text
                        })
                    }).then((res) => {

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            }
        }

    }

    visitors(){

        return {
            getCurrent: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "user/visitors"
                    }).then((res) => {

                        this.tempData.visitorsPage = 0;

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            getNextPage: () => {

                return new Promise((resolve, reject) => {

                    this.tempData.visitorsPage++;

                    this.axios({
                        url: this.endpoint + "user/visitors",
                        params: { page: this.tempData.visitorsPage }
                    }).then((res) => {

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            }
        }

    }

    /*
    * Posts and Content management
    */

    pulse(id = "all"){

        return {
            getCurrent: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "pulse/" + id

                    }).then((res) => {

                        this.tempData.pulse[id] = {
                            lastEntryDate: res.data.stories[res.data.stories.length-1].date,
                            lastPage: 0
                        };

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            getNextPage: () => {

                return new Promise((resolve, reject) => {

                    this.tempData.pulse[id].lastPage ++;

                    this.axios({
                        url: this.endpoint + "pulse/" + id,
                        params: { before: this.tempData.pulse[id].lastEntryDate, ph: this.tempData.pulse[id].lastPage }
                    }).then((res) => {

                        this.tempData.pulse[id] = {
                            lastEntryDate: res.data.stories[res.data.stories.length-1].date,
                            lastPage: this.tempData.pulse[id].lastPage
                        };

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            post: (text, asGroup = "") => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        method: "post",
                        url: `${this.endpoint}pulse/${id}`,
                        data: this.qs.stringify({
                            body: text,
                            asGroup
                        })
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            }
        }

    }

    story(id){

        return {
            getStory: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "story/" + id
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            heart: () => this.heart("story", id),
            comments: (commentId = null) => this.comments("story", id, commentId)
        }

    }

    comments(target, id, commentId = null){
        return{
            get: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: `${this.endpoint}comments/${target}/${id}`
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });
                
            },
            post: (text) => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        method: "post",
                        url: `${this.endpoint}comments/${target}/${id}`,
                        data: this.qs.stringify({
                            body: text
                        })
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            delete: (commentId) => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        method: "delete",
                        url: `${this.endpoint}${target}/${commentId}`
                    }).then((res) => {
                        resolve(res.data);
                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            heart: () => this.heart(target, commentId)
        }
    }

    heart(target, id){

        return new Promise((resolve, reject) => {

            this.axios({
                method: "post",
                url: `${this.endpoint}heart/${target}/${id}`
            }).then((res) => {
                resolve(res.data);
            }).catch((res) => {
                reject(res.response);
            });

        });

    }

    /*
    * Chats and messages
    */

    startChatClient(){

        this.chatClient = this.socket(this.wsEndpoint, { headers: { "Cookie": this.tempData.sessionCookie } });

        this.chatClient.on("open", () => {
            this.eventEmitter.emit("connected");
        });

        this.chatClient.on("error", (error) => {
            this.eventEmitter.emit("error", error);
        });

        this.chatClient.on("closed", () => {
            this.eventEmitter.emit("closed");
        });

        this.chatClient.on("reconnect", (attemps) => {
            this.eventEmitter.emit("reconnect", attemps);
        });

        //triggers when the user gets a chat message
        this.chatClient.on("message", (msg) => {

            let messageObject = {
                message: msg,
                actions: this.messageActions(msg.id),
                chat: this.chat(msg.sender)
            };

            this.eventEmitter.emit("message", messageObject);

        });

        this.chatClient.on("notify", (notification) => {

            this.eventEmitter.emit("notify", notification);

        });

    }

    chats(){

        return new Promise((resolve, reject) => {

            if(this.chatClient.ws.readyState === 1){

                this.chatClient.send("peers", {}, (data) => {
                    resolve(data);
                });

            }else{
                reject({ error: "no_connection" });
            }

        });

    }

    chat(peer){

        return {

            send: (message) => {

                return new Promise((resolve, reject) => {

                    if(this.chatClient.ws.readyState === 1){

                        this.chatClient.send("message", { receiver: peer, message }, (data) => {
                            resolve(data);
                        });

                    }else{
                        reject({ error: "no_connection" });
                    }


                });

            },

            get: (limit = 30, thumb = false) => {

                return new Promise((resolve, reject) => {

                    if(this.chatClient.ws.readyState === 1){

                        this.chatClient.send("history", { peer, limit, thumb }, (data) => {
                            resolve(data);
                        });

                    }else{
                        reject({ error: "no_connection" });
                    }

                });

            },

            typing: (typing = true) => {

                if(typing){
                    this.chatClient.send("typing", { peer });
                }else {
                    this.chatClient.send("nottyping", { peer });
                }

            }

        }

    }

    messageActions(id){

        return {
            read: () => {
                this.chatClient.send("read", { id });
            },
            delete: () => {
                this.chatClient.send("delete", { id });
            },
            archive: () => {
                this.chatClient.send("archive", { id });
            },
            unarchive: () => {
                this.chatClient.send("unarchive", { id });
            }
        }

    }

    /*
    * Notification Management
    */

    notifications(){

        return {

            getCurrent: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "notifications"
                    }).then((res) => {

                        if(res.data.notifications.length > 0){
                            this.tempData.lastNotificationDate = res.data.notifications[res.data.notifications.length-1].date;
                        }

                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },
            getNextPage: () => {

                return new Promise((resolve, reject) => {

                    this.axios({
                        url: this.endpoint + "notifications",
                        params: { before: this.tempData.lastNotificationDate }
                    }).then((res) => {

                        if(res.data.notifications.length > 0){
                            this.tempData.lastNotificationDate = res.data.notifications[res.data.notifications.length-1].date;
                        }
                        resolve(res.data);

                    }).catch((res) => {
                        reject(res.response);
                    });

                });

            },

        }

    }

    notification(id) {

        return {

            read: () => {

                this.axios({
                    method: "post",
                    url: this.endpoint + "notifications/" + id,
                    data: this.qs.stringify({
                        read: 1
                    })
                });

            },
            delete: () => {

                this.axios({
                    method: "delete",
                    url: this.endpoint + "notifications/" + id
                });

            }

        }

    }

    requests(){

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