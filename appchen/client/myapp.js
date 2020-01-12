import {initializeApp} from "/appchen/client/app.js"
import {eventing} from "/appchen/client/io.js";

const app = initializeApp([
    {title: 'The Tab1', src: '/appchen/client/tab1.js'},
    {title: 'The Tab2', src: '/appchen/client/tab2.js'},
    {title: 'The Tab3', src: '/appchen/client/modules/tab3.js'}]);

app.props = {
    start: '2020-01-01',
    end: '2021-01-01'
};

const ev = eventing();

ev.registerEventSourcing({
    topic: {
        uri: 'zen', handler: (event) => {
            document.getElementById('status').textContent = event.lesson;
        }
    }
});

ev.registerEventSourcing({
    topic: {
        uri: 'transaction', handler: (event) => {
            document.getElementById('status').textContent = 'executionTime: ' + event.executionTime;
        }
    }
});

app.activateTabFromHash();
