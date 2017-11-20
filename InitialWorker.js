const winston = require('winston');
const Nightmare = require('nightmare');
const Worker = require('./Worker.js').Worker;

const SHOW = true;
const TIME_OUT = 40000;

class InitialWorker extends Worker{
    constructor(task) {
        super(task);
    }

    async start() {
        return this.crawlMsg();
    }

    async crawlMsg() {
        const browser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true}});
        let scenario = this.task.scenarioFactory({});
        return scenario.attachTo(browser)
                .inject('js','./utils.js')
                .inject('js','./optimal-select.js')
                .evaluate(this.task.htmlAnalysis)
                .end()
                .then( result => {
                    return this.task.postAnalysis({},result);
                })
    }
}

module.exports.InitialWorker = InitialWorker;