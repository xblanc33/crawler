JS Framework For Crawling With NightMareJS Actions
==================================

Very simple library to crawl any web site.
It uses [NightmareJS](https://github.com/segmentio/nightmare).


Install
-------


You can clone it and use npm to install its dependencies.

    clone https://github.com/xblanc33/crawler.git
    cd crawler
    npm install

Then You have to run docker-compose because the crawler needs RabbitMQ and MongoDB:

    cd docker
    docker-compose up --build


Then you can run the test:

    npm test


Crawler
--------

To crawl a web site, you have first to create one crawler by giving it the host name of the MongoDB and RabbitMQ servers.
Once created, you can set if the initial crawl task to perform, and the next ones.
Then you can ask the crawler to start !

    const crawler = new Crawler('localhost','localhost');
    crawler.setInitialTask(tasks.search);
    crawler.addTasks([tasks.analysis]);
    crawler.start().then(() => { done();}).catch(e => {console.log(e);});			


Task
------

The crawler performs crawling tasks (initial crawl task as well as the next ones).
A Task has a name (which also correspond to the name of its input RabbitMQ), a factory that creates scenario to crawl, a function that analyse the crawled HTML (optional), and a function that performs post treatments. 

Here is the Google Analysis Task (with no HTML and no Post analysis)

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




