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

    addStep(level, scenarioFactory, htmlAnalysis, postAnalysis) {
        if (Number.isInteger(level)) {
            winston.info(`Add step for level ${level}`)
            this.steps[level] = new Step(this.name, level, scenarioFactory, htmlAnalysis, postAnalysis); 
        } else {
            winston.info(`cannot add step as ${level} is not an integer`)
        }
    }


    start() {
        winston.info('Crawler is launching the rabbit queues (one per level)');
        return amqp.connect(this.rabbit)
            .then(conn => {
                this.conn = conn;
                return conn.createConfirmChannel();
            })
            .then(ch => {
                this.ch = ch;
                this.steps.forEach(step => {step.setRabbitChannel(ch);})
                return Promise.all(Object.keys(this.steps).map( key => {
                    return ch.assertQueue(`${this.name}-level-${key}`,{ durable: true });
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
        const levels = Object.keys(this.steps);
        await this.crawlStep(this.steps[levels[0]], {});
        for (let i=1 ; i < levels.length ; i++) {
            const queue = `${this.name}-level-${levels[i]}`;
            let stop = false;
            while (!stop) {
                let msg;
                try {
                    msg = await this.ch.get(queue);
                    if (msg === false) {
                        stop = true;
                    } else {
                        await this.crawlStep(this.steps[levels[i]], JSON.parse(msg.content.toString()));
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