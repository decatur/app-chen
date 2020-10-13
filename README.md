# appchen

This is a client/server web framework based an Python and modern JavaScript.
* Wraps the superb client side component codemirror as a Python package.
* Supports real time streaming via Server Send Events
* Supports single page applications and in-app navigation
* Supports on-the-fly web parts
* Depends on Flask and MongoDB only
* Uses es6 modules and plain vanilla JavaScript

# Setup
 
## Option A: Clone appchen

````shell script
git clone https://github.com/decatur/appchen.git
cd appchen/
python -m venv ./venv
source venv/Scripts/activate
pip install -r requirements.txt
 ````

## Option B: Install into Existing Project

````shell script
pip install git+https://github.com/decatur/appchen.git
pip install appchen
 ````

# Run Demo Web Server

````shell script
/c/tools/mongodb/bin/mongod --port 27017 --dbpath /c/data/db
python -m appchen.web_demo.run_server --mongoport=27017 --httpport=8080
 ````

You may now navigate to http://localhost:8080 with Chrome or Firefox.


# Run Demo Python Client

````shell script
python -m appchen.web_demo.client --httpport=8080
````

# Build

````shell script
vi pyproject.toml
git add pyproject.toml
git commit -m'bumped version'
git tag x.y.z
poetry build
````

# Publishing to PyPI

````shell script
poetry config repositories.test_pypi https://test.pypi.org/legacy/
poetry config http-basic.test_pypi user password
poetry config http-basic.pypi user password

poetry publish -r test_pypi
````
