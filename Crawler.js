const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const amqp = require('amqplib');
const Nightmare = require('nightmare');
const Worker = require('./Worker.js').Worker;
const InitialWorker = require('./InitialWorker.js').InitialWorker;
const task = require('./Task.js').task;



class Crawler {
    constructor(rabbit, mongo) {
        this.rabbit = `amqp://${rabbit}`;
        this.mongo = `mongodb://${mongo}:27017/crawler`;
        this.tasks = [];
        this.initialTask = undefined;
    }

    setInitialTask(task) {
        this.initialTask = task;
    }

    addTask(task) {
        this.tasks.push(task);
    }

    addTasks(tasks) {
        this.tasks = tasks;
    }


    start() {
        winston.info('Crawler is launching the rabbit queues (one per task)');
        return amqp.connect(this.rabbit)
            .then(conn => {
                this.conn = conn;
                return conn.createConfirmChannel();
            })
            .then(ch => {
                this.ch = ch;
                if (this.initialTask) {
                    this.initialTask.setRabbitChannel(ch);
                }   
                this.tasks.forEach(task => {task.setRabbitChannel(ch);})
                return Promise.all(this.tasks.map( task => {
                    return ch.assertQueue(`${task.inputQueue}`,{ durable: true });
                }));
            })
            .then( () => {
                this.ch.prefetch(1);
            })
            .then( () => {
                return MongoClient.connect(this.mongo);
            })
            .then( db => {
                if (this.initialTask) {
                    this.initialTask.setMongoConnection(db);
                }
                this.tasks.forEach(task => {task.setMongoConnection(db);})
                this.db = db;
            })
            .then( () => {
                return this.startWorkers();
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

    async startWorkers() {
        winston.info(`consume`);
        if (this.initialTask) {
            let initialWorker = new InitialWorker(this.initialTask);
            await initialWorker.start();
        }

        for (let i=0 ; i < this.tasks.length ; i++) {
            let worker = new Worker(this.tasks[i]);
            await worker.start();
        }
        winston.info(`worker have been started`);
    }
}



module.exports.Crawler = Crawler;