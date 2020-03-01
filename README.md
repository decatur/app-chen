# app-chen

This is a client/server web framework based an Python and modern JavaScript.
* Wraps the superb client side components codemirror and grid-chen as a Python package.
* Supports real time streaming via Server Send Events
* Supports single page applications and in-app navigation
* Supports on-the-fly web parts
* Depends on Flask and MongoDB only
* Uses es6 modules and plain vanilla JavaScript

# Setup

````shell script
 /c/ws/tools/python3/python -m venv venv
 ````


# Running the demo

````shell script
pip install Flask pymongo git+https://github.com/decatur/app-chen.git
/c/tools/mongodb/bin/mongod --port 27017 --dbpath /c/data/db
python -m appchen.demo
````
Then navigate to http://localhost:8080/ with modern Chrome or Firefox.
