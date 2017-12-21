JS Framework For Crawling With NightMareJS Actions
==================================

Very simple library to crawl with [NightmareJS](https://github.com/segmentio/nightmare).


Install
-------


You can clone it and use npm to install its dependencies.

    clone https://github.com/xblanc33/crawler.git
    npm install
    npm test




Task
------

The class you have to instantiate and give your three crawling functions.

scenarioFactory(msg) should return a scenario (see [WAT](https://github.com/webautotester/action_nightmare.git) )
htmlAnalysis will be executed by NightMareJS (see evaluate [NightmareJS](https://github.com/segmentio/nightmare) )
postAnalysis(msg,result) will be executed afterward (result is the return of htmlAnalysis)

Each Task has its queue (Rabbit) where it reads messages.
Each message is given to scenarioFactory and postAnalysis as an input (msg).

This class also provides useful functions to interact with Rabbit and Mongo

Worker
------

The worker that will execute the task


Crawler
--------

The crawler will launch the workers

Docker 
------

A docker-compose for running Rabbit and Mongo