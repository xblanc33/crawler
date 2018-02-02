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
const Nightmare = require('nightmare');

const SHOW = true;
const TIME_OUT = 40000;

class Worker {
    constructor(options) {
        if ([undefined, null].includes(options.task)) throw 'Task is needed';
        //if (options.task === undefined || options.task === null) throw "Task is needed";

        this.task = options.task;
        this.proxy = null || options.proxy;
        this.browserKind = options.browserKind;
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

    chooseProxy() {
        if (Array.isArray(this.proxy)) {
            return this.proxy[Math.floor(Math.random() * 100) % this.proxy.length];
        } else {
            return this.proxy;
        }
    }

    createBrowser() {
        let retBrowser;

        if ([undefined, null].includes(this.proxy)) {
            retBrowser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true}});
	    } else {
            let proxy = this.chooseProxy();
            retBrowser = new Nightmare({show:SHOW, width:1800, height:1500, loadTimeout: TIME_OUT , gotoTimeout: TIME_OUT, switches:{'ignore-certificate-errors': true, 'proxy-server': proxy.host}});
            if (proxy.needAuthentication()) {
                retBrowser.authentication(proxy.username, proxy.password);
            }
            
        }
	    retBrowser.useragent("Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36");
	    return retBrowser;
    }

    async crawlMsg(msg) {
        const browser = this.createBrowser();
        let scenario = this.task.scenarioFactory(msg);
        let run = await scenario.run(browser, this.browserKind);
        if (run.success) {
            browser.inject('js','./optimal-select.js')
                .evaluate(this.task.htmlAnalysis)
                .end()
                .then( result => {
                    return this.task.postAnalysis(msg, result);
                })
        } else {
            return Promise.reject(run.error);
        }
        
    }
}

module.exports.Worker = Worker;
