const Task = require('../Task.js').Task;
const wat_action = require('wat_action_nightmare');
const winston = require('winston');

const WAIT_TEMPO = 4000;
const SCROLL_X = 800;
const SCROLL_Y = 800;

const SEARCH_QUERY = "github xblanc33 crawler";
const GOOGLE_SEARCH_SELECTOR = '#sfdiv';
const GOOGLE_SUBMIT_SELECTOR = '#tsf > div.tsf-p > div.jsb > center > input[type="submit"]:nth-child(1)';
const GOOGLE_ANSWERS_SELECTOR = '#rso > div > div';

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
    }
);

module.exports.tasks = {
    search : search
}