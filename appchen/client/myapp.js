import {initializeApp} from "/appchen/client/app.js"
import * as io from "/appchen/client/io.js";

const app = initializeApp([
    {title: 'The Tab1', src: '/appchen/client/tab1.js'},
    {title: 'Live Trades', src: '/appchen/client/live-trades.js'},
    {title: 'The Tab3', src: '/appchen/client/modules/tab3.js'},
    {title: 'Message Discovery', src: '/appchen/client/message-discovery.js'}]);

app.props = {
    start: '2020-01-01',
    end: '2021-01-01'
};

const statusElement = document.getElementById('status');
const stream = io.stream();

stream.subscribe({
    topics: [{
        uri: 'zen', handler: (zen) => {
            statusElement.textContent = zen['lesson'];
        }
    }]
});

stream.setErrorListener((event) => {
    const eventSource = event.target;
    statusElement.textContent = io.readyStateLabels[eventSource.readyState] + ' ' + eventSource.url;
});

stream.setOpenListener((event) => {
    const eventSource = event.target;
    statusElement.textContent = io.readyStateLabels[eventSource.readyState] + ' ' + eventSource.url;
});

app.activateTabFromHash();
