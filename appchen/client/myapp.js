import {initializeApp} from "/appchen/client/app.js"
import {eventing} from "/appchen/client/io.js";

const app = initializeApp([
    {title: 'The Tab1', src: '/appchen/client/tab1.js'},
    {title: 'The Tab2', src: '/appchen/client/tab2.js'},
    {title: 'The Tab3', src: '/appchen/client/tab3.js'}]);

app.props = {
    start: '2020-01-01',
    end: '2021-01-01'
};

const ev = eventing();
ev.register({
    'zen': function (event) {
        console.log(event);
        document.getElementById('status').textContent = event.json.lesson;
    },
    'transaction': function (event) {
        console.log(event);
        document.getElementById('status').textContent = 'executionTime: ' + event.json.executionTime;
    }
});

app.activateTabFromHash();
