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
        document.getElementById('status').textContent = JSON.parse(event.data).lesson;
    },
    'moduleChanged': function (event) {
        console.log(event);
        document.getElementById('status').textContent = 'moduleChanged: ' + JSON.parse(event.data).name;
    }
});

app.activateTabFromHash();
