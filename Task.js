const winston = require('winston');

class Task {
    constructor(inputQueue, scenarioFactory, htmlAnalysis, postAnalysis) {
        this.inputQueue = inputQueue;
        this.scenarioFactory = scenarioFactory;
        this.htmlAnalysis = htmlAnalysis;
        this.postAnalysis = postAnalysis;
    }

    setRabbitChannel(ch) {
        this.ch = ch;
    }

    setMongoConnection(db) {
        this.db = db;
    }

    sendMessageToQueue(msg, queue) {
        return this.ch.assertQueue(queue,{ durable: true })
            .then( () => {
                return this.ch.sendToQueue(queue,Buffer.from(JSON.stringify(msg)), { persistent: true });
            })
            .then( () => {
                return this.ch.waitForConfirms();
            })
    }

    sendArrayOfMessagesToQueue(msgArray, queue) {
        return this.ch.assertQueue(queue,{durable: true})
            .then(async  () => {
                for (let i=0 ; i < msgArray.length ; i++) {
                    await this.ch.sendToQueue(queue,Buffer.from(JSON.stringify(msgArray[i])), { persistent: true });
                }
            })
            .then( () => {
                return this.ch.waitForConfirms();
            })
    }

    save(data, col) {
        let element = {
            data: data
        }
        return new Promise((res , rej)=> {
            this.db.collection(col, (err, collection) => {
                if (err) {
                    rej(err);
                } else {
                    collection.insert(element)
                        .then( inserted => {
                            res(inserted);
                        })
                        .catch( err => {
                            rej(err);
                        })
                }
            })
        });
    }

    find(data, col) {
        let element = {
            data: data
        }
        return new Promise((res , rej)=> {
            this.db.collection(col, (err, collection) => {
                if (err) {
                    rej(err);
                } else {
                    collection.findOne(element)
                        .then( inserted => {
                            res(inserted);
                        })
                        .catch( err => {
                            rej(err);
                        })
                }
            })
        });
    }
}

module.exports.Task = Task;