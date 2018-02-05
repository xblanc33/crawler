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
const { Chromeless } = require('chromeless');
const puppeteer = require('puppeteer');

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
        winston.info(`Worker starts with task : ${this.task.inputQueue}`);
        await this.getMessageMainLoop();
        winston.info(`Worker ends with task : ${this.task.inputQueue}`);
    }

    async getMessageMainLoop() {
        let stop = false;
        while (!stop) {
            let msg;
            msg = await this.task.ch.get(this.task.inputQueue);
            if (msg === false) {
                stop = true;
            } else {
                await this.performMessage(JSON.parse(msg.content.toString()));
                await this.task.ch.ack(msg);
            }
        }
    }

    async performMessage(msg) {
        const browserObject =  await this.createBrowser();
        const browser = browserObject.browser;
        let run = await this.runScenario(msg, browser);
        if (run.success) {
            let analysisResult = await this.evaluateHTMLAnalysis(browser);
            await this.performPostAnalysis(msg, analysisResult);
        } else {
            winston.error(run.error);
        }
    }

    async createBrowser() {
        switch (this.browserKind) {
            case 'NIGHTMARE': 
                let nightmare = this.createNightmare();
                return {browser:nightmare};
            case 'CHROMELESS':
                return {browser:new Chromeless()};
            case 'PUPPETEER':
                let pupp = await this.createPuppeteer();
                return {browser:pupp};
            default:
                throw `${this.browserKind} is not supported, the worker can't create browser`;
        }
    }
 

    createNightmare() {
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

    chooseProxy() {
        if (Array.isArray(this.proxy)) {
            return this.proxy[Math.floor(Math.random() * 100) % this.proxy.length];
        } else {
            return this.proxy;
        }
    }

    async createPuppeteer() {
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();
        return page;
    }



    async runScenario(msg, browser) {   
        let scenario = this.task.scenarioFactory(msg);
        let run = await scenario.run(browser, this.browserKind);
        return run;
    }

    evaluateHTMLAnalysis(browser) {
        switch (this.browserKind) {
            case 'NIGHTMARE': 
                return this.evaluateHTMLAnalysisWithNightmare(browser);
            case 'CHROMELESS':
                return this.evaluateHTMLAnalysisWithChromeless(browser);
            case 'PUPPETEER':
                return this.evaluateHTMLAnalysisWithPuppeteer(browser);
            default:
                throw `${this.browserKind} is not supported, the worker can't evaluate the HTML analysis`;
        }
    }

    async evaluateHTMLAnalysisWithNightmare(browser) {
        let result = await browser
                            .inject('js','./optimal-select.js')
                            .evaluate(this.task.htmlAnalysis)
                            .end();

        return result;
    }

    async evaluateHTMLAnalysisWithChromeless(browser) {
        let result = await browser
                            .wait(2000)
                            .evaluate(this.task.htmlAnalysis)
                            .end();

        return result;
    }

    async evaluateHTMLAnalysisWithPuppeteer(browser) {
        let result = await browser.evaluate(this.task.htmlAnalysis);
        await browser.close();
        return result;
    }

    performPostAnalysis(msg, result) {
        return this.task.postAnalysis(msg, result);
    }
}

module.exports.Worker = Worker;
