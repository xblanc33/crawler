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

    chooseProxy()
    {
        if (this.proxy.isArray())
        {
            return this.proxy[Math.floor(Math.random() * 100) % this.proxy.length].host;
        }
        else
        {
            return this.proxy.host;
        }
    }

    createBrowser() {
        let retBrowser;

        if (this.proxy !== null)
            retBrowser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true, 'proxy-server': this.chooseProxy()}});
        else
            retBrowser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true}});
        if (this.proxy != null && this.proxy.needAuthentication())
            retBrowser.authentication(this.proxy.username, this.proxy.password);

	retBrowser.useragent("Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36");
	
	return retBrowser;
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
