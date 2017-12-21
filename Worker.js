const winston = require('winston');
const Nightmare = require('nightmare');

const SHOW = true;
const TIME_OUT = 40000;

class Worker {
    constructor(task, proxy = null) {
        this.task = task;
        this.proxy = proxy;
    }

    async start() {
        winston.info(`Worker starts wiht task : ${this.task.inputQueue}`);
        let stop = false;
        while (!stop) {
            let msg;
            try {
                msg = await this.task.ch.get(this.task.inputQueue);
                if (msg === false) {
                    stop = true;
                } else {
                    await this.crawlMsg(JSON.parse(msg.content.toString()));
                    await this.task.ch.ack(msg);
                }
            } catch(e) {
                winston.error(e);
                stop = true;
            }
        }
    }

    createBrowser() {
        if (this.proxy != null)
            return new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true, 'proxy-server': this.proxy}});
        else
            return browser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true}});

    }

    async crawlMsg(msg) {
        const browser = this.createBrowser();
        let scenario = this.task.scenarioFactory(msg);
        return scenario.attachTo(browser)
                .inject('js','./utils.js')
                .inject('js','./optimal-select.js')
                .evaluate(this.task.htmlAnalysis)
                .end()
                .then( result => {
                    return this.task.postAnalysis(msg, result);
                })
    }
}

module.exports.Worker = Worker;