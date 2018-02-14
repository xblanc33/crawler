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
        const page =  await this.createPage();
        winston.info(`page:${page}`)
        let run = await this.runScenario(page, msg);
        if (run.success) {
            let analysisResult = await this.evaluateHTMLAnalysis(page);
            await this.performPostAnalysis(msg, analysisResult);
        } else {
            winston.error(run.error);
        }
    }

    async createPage() {
        let browser;
        let page;
        if ([undefined, null].includes(this.proxy)) {
            browser = await puppeteer.launch({headless: false, args:['--no-sandbox']});
        } else {
            let proxyServerArg;
            let proxy = this.chooseProxy();
            if (proxy.needAuthentication()) {
                proxyServerArg = `${proxy.host}:${proxy.username}:${proxy.password}`;
            } else {
                proxyServerArg = proxy.host;
            }
            browser = await puppeteer.launch({headless: false, args:['--no-sandbox', `--proxy-server=${proxyServerArg}`]});
        }
        page = await browser.newPage();
        return page;
    }
   

    chooseProxy() {
        if (Array.isArray(this.proxy)) {
            return this.proxy[Math.floor(Math.random() * 100) % this.proxy.length];
        } else {
            return this.proxy;
        }
    }


    async runScenario(page, msg) {
        winston.info(`runScenario: ${page}, ${JSON.stringify(msg)}`);
        let scenario = this.task.scenarioFactory(msg);
        winston.info(`scenario: ${JSON.stringify(scenario)}`);
        let run = await scenario.run(page);
        winston.info(`run: ${JSON.stringify(run)}`);
        return run;
    }

    async evaluateHTMLAnalysis(page) {
        await page.addScriptTag({path:'./optimal-select.js'});
        let result = await page.evaluate(this.task.htmlAnalysis);
        await page.close();
        return result;
    }

    performPostAnalysis(msg, result) {
        return this.task.postAnalysis(msg, result);
    }
}

module.exports.Worker = Worker;
