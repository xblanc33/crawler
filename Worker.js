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
        if (Array.isArray(this.proxy))
        {
            return this.proxy[Math.floor(Math.random() * 100) % this.proxy.length];
        }
        else
        {
            return this.proxy;
        }
    }

    createBrowser() {
        let retBrowser;

        if (this.proxy !== null)
	{
	    let proxy = this.chooseProxy();

            retBrowser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true, 'proxy-server': proxy.host}});
            if (proxy.needAuthentication())
		retBrowser.authentication(proxy.username, proxy.password);
	}
        else
	    retBrowser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true}});
	
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
