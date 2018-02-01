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
const Worker = require('./Worker.js').Worker;

const SHOW = true;
const TIME_OUT = 40000;

class InitialWorker extends Worker{
    constructor(task, proxy) {
        super(task, proxy);
    }

    async start() {
        winston.info('InitialWorker is starting');
        return this.crawlMsg();
    }

    async crawlMsg() {
        const browser = this.createBrowser();
        let scenario = this.task.scenarioFactory({});
        let run = await scenario.run(browser, 'NIGHTMARE');
        if (run.success) {
            return browser.inject('js','./optimal-select.js')
                    .evaluate(this.task.htmlAnalysis)
                    .end()
                    .then( result => {
                        winston.log('will do post analysis');
                        return this.task.postAnalysis({},result);
                    })
        } else {
            return Promise.reject(run.error);
        }
    }
}

module.exports.InitialWorker = InitialWorker;