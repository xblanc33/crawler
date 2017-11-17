const winston = require('winston');

class Step {
    constructor(scenarioFactory, htmlAnalysis, postAnalysis) {
        this.scenarioFactory = scenarioFactory;
        this.htmlAnalysis = htmlAnalysis;
        this.postAnalysis = postAnalysis;
    }

    setCrawlName(crawlName) {
        this.crawlName = crawlName;
    }

    setPositionInCrawl(position)  {
        this.position = position;
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

    sendMessageToNextQueue(msg) {
        return this.sendMessageToQueue(msg, `${this.crawlName}-level-${this.position+1}`);
    }

    sendArrayOfMessagesToQueue(msgArray, queue) {
        winston.info('send messages');
        return this.ch.assertQueue(queue,{durable: true})
            .then(async  () => {
                for (let i=0 ; i < msgArray.length ; i++) {
                    winston.info('send messages:'+i);
                    await this.ch.sendToQueue(queue,Buffer.from(JSON.stringify(msgArray[i])), { persistent: true });
                }
            })
            .then( () => {
                return this.ch.waitForConfirms();
            })
    }

    sendArrayOfMessagesToNextQueue(msg) {
        return this.sendArrayOfMessagesToQueue(msg, `${this.crawlName}-level-${this.position+1}`);
    }

    save(data, col) {
        let element = {
            data: data
        }
        col = col || this.crawlName;
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

}

module.exports.Step = Step;