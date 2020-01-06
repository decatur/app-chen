import {initializeApp} from "./app.js"

const app = initializeApp([
    {title: 'The Tab1', src: '/modules/tab1.js'},
    {title: 'The Tab2', src: '/modules/tab2.js'},
    {title: 'The Tab3', src: '/modules/tab3.js'}]);

app.props = {
    start: '2020-01-01',
    end: '2021-01-01'
};

app.register({
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
