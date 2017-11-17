const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const amqp = require('amqplib');
const Nightmare = require('nightmare');
const Step = require('./Step.js').Step;

const SHOW = false;
const TIME_OUT = 40000;

class Crawler {
    constructor(rabbit, mongo, name) {
        this.rabbit = `amqp://${rabbit}`;
        this.mongo = `mongodb://${mongo}:27017/${name}`;
        this.name = name;
        this.steps = [];
    }

    addStep(step) {
        this.steps.push(step);
    }

    addSteps(steps) {
        this.steps = steps;
    }


    start() {
        winston.info('Crawler is launching the rabbit queues (one per level)');
        for (let i = 0 ; i < this.steps.length ; i++) {
            this.steps[i].setPositionInCrawl(i);
            this.steps[i].setCrawlName(this.name);
        }
        return amqp.connect(this.rabbit)
            .then(conn => {
                this.conn = conn;
                return conn.createConfirmChannel();
            })
            .then(ch => {
                this.ch = ch;
                this.steps.forEach(step => {step.setRabbitChannel(ch);})
                let indexesOfQueuesInBetween2Steps = Object.keys(this.steps); 
                indexesOfQueuesInBetween2Steps.shift();//indexes start at 1 (not 0)
                return Promise.all(indexesOfQueuesInBetween2Steps.map( index => {
                    return ch.assertQueue(`${this.name}-level-${index}`,{ durable: true });
                }));
            })
            .then( () => {
                this.ch.prefetch(1);
            })
            .then( () => {
                return MongoClient.connect(this.mongo);
            })
            .then( db => {
                this.steps.forEach(step => {step.setMongoConnection(db);})
                this.db = db;
            })
            .then( () => {
                return this.consume();
            })
            .then( () => {
                this.db.close();
            })
            .then( () => {
                this.ch.close();
            })
            .then( () => {
                this.conn.close();
            })
            .then( () => {
                return 'consume is done';
            })
    }

    async consume() {
        winston.info(`consume`);
        await this.crawlStep(this.steps[0], {});
        for (let i=1 ; i < this.steps.length ; i++) {
            const queue = `${this.name}-level-${i}`;
            let stop = false;
            while (!stop) {
                let msg;
                try {
                    msg = await this.ch.get(queue);
                    if (msg === false) {
                        stop = true;
                    } else {
                        await this.crawlStep(this.steps[i], JSON.parse(msg.content.toString()));
                        await this.ch.ack(msg);
                    }
                } catch(e) {
                    winston.error(e);
                    stop = true;
                }
            }
        }
        winston.info(`end of consume`);
    }

    async crawlStep(step, options) {
        const browser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true}});
        let scenario = step.scenarioFactory(options);
        return scenario.attachTo(browser)
                .inject('js','./utils.js')
                .inject('js','./optimal-select.js')
                .evaluate(step.htmlAnalysis)
                .end()
                .then( result => {
                    return step.postAnalysis(result,this.bd,this.ch, this.name);
                })
    }
}



module.exports.Crawler = Crawler;