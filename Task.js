/*Copyright (c) 2017-2018 Xavier Blanc <blancxav@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/

const winston = require('winston');

class Task {
    constructor(inputQueue, scenarioFactory, htmlAnalysis, postAnalysis) {
        this.inputQueue = inputQueue;
        this.scenarioFactory = scenarioFactory;
        this.htmlAnalysis = htmlAnalysis || emptyHTMLAnalysis;
        this.postAnalysis = postAnalysis || emptyPostAnalysis;
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

    saveToMongo(data, col) {
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

    findInMongo(data, col) {
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

function emptyHTMLAnalysis() {
    return {};
}

function emptyPostAnalysis(options, result) {
    return Promise.resolve(result || {});
}

module.exports.Task = Task;