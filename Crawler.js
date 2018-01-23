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
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const amqp = require('amqplib');
const Nightmare = require('nightmare');
const Worker = require('./Worker.js').Worker;
const InitialWorker = require('./InitialWorker.js').InitialWorker;

class Crawler {
    constructor(rabbit, mongo, proxy = null) {
        this.proxy = proxy;
        this.rabbit = `amqp://${rabbit}`;
        this.mongo = `mongodb://${mongo}:27017/crawler`;
        this.tasks = [];
        this.initialTask = undefined;
    }

    setProxy(proxy) {
        this.proxy = proxy;
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
                this.tasks.forEach(task => {task.setRabbitChannel(ch);});
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
                return 'crawl is finished';
            })
    }

    async startWorkers() {
        winston.info(`start all workers`);
        if (this.initialTask) {
            let initialWorker = new InitialWorker(this.initialTask, this.proxy);
            await initialWorker.start();
        }

        for (let i=0 ; i < this.tasks.length ; i++) {
            let worker = new Worker(this.tasks[i], this.proxy);
            await worker.start();
        }
        winston.info(`workers did their jobs`);
    }
}

module.exports.Crawler = Crawler;
