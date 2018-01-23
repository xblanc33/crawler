const Crawler = require('../Crawler.js').Crawler;
const tasks = require('./GoogleTasks.js').tasks;
const assert = require('assert');
const amqp = require('amqplib');
const winston = require('winston');


describe('Create crawler for Google', function () {
	it ('should get the message and exit', function(done) {
        const crawler = new Crawler('localhost','localhost');
        crawler.setInitialTask(tasks.search);
        crawler.start().then(() => { done();}).catch(e => {console.log(e);});			
	});
});
