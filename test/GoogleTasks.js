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

const Task = require('../Task.js').Task;
const wat_action = require('wat_action_nightmare');
const winston = require('winston');

const WAIT_TEMPO = 4000;
const SCROLL_X = 800;
const SCROLL_Y = 800;

const SEARCH_QUERY = "github xblanc33 crawler";
const GOOGLE_SEARCH_SELECTOR = '#sfdiv';
const GOOGLE_SUBMIT_SELECTOR = '#tsf > div.tsf-p > div.jsb > center > input[type="submit"]:nth-child(1)';



search = new Task(
    'search',
    function(options) {
        let scenario = new wat_action.Scenario();
        let gotoAction;
        winston.info(`page: google root`)
        gotoAction = new wat_action.GotoAction('https://www.google.com');
        scenario.addAction(gotoAction);

        let waitAction = new wat_action.WaitAction(WAIT_TEMPO);
        scenario.addAction(waitAction);

        let type = new wat_action.TypeAction(GOOGLE_SEARCH_SELECTOR,SEARCH_QUERY);
        scenario.addAction(type);

        let click = new wat_action.ClickAction(GOOGLE_SUBMIT_SELECTOR,SEARCH_QUERY);
        scenario.addAction(click);

        scenario.addAction(waitAction);
        return scenario;
    },
    function() {
        const GOOGLE_ANSWERS_SELECTOR = '#rso > div > div';
        let computeCSSSelector = window['OptimalSelect'].select;
        let resultsChildren = document.querySelector(GOOGLE_ANSWERS_SELECTOR).children;
        let answers = [];

        for (i = 0 ; i < resultsChildren.length ; i++) {
            let ref = resultsChildren[i].children[0].children[0].children[0].children[0];
            let answer = {
                href : ref.getAttribute('href'),
                selector : computeCSSSelector(ref)
            }
            answers.push(answer);
        }
        return answers;
    },
    function(options, result) {
        return this.sendArrayOfMessagesToQueue(result, 'analysis');
    }
);

analysis = new Task(
    'analysis',
    function(options) {
        let scenario = new wat_action.Scenario();
        let gotoAction;
        winston.info(`page: ${options.href}`)
        gotoAction = new wat_action.GotoAction(options.href);
        scenario.addAction(gotoAction);

        let waitAction = new wat_action.WaitAction(WAIT_TEMPO);
        scenario.addAction(waitAction);

        return scenario;
    }
);

module.exports.tasks = {
    search : search,
    analysis : analysis
}