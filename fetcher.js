const process = require('process');

const request = require('request-promise-native');
const _ = require('lodash');

const extract = (haystack, needle) => needle.exec(haystack)[1];

const ips = process.argv.slice(2);
const p = Promise.all(ips.map(ip => request('http://' + ip + ':7472/logs')));

p.then(data => {
	const logLines = _.flatten(data.map(el => el.split('\n')));//.filter(line => line.match(/\+ \+/g));
	const filter = regex => logLines.filter(line => line.match(regex)).map(line => extract(line, regex)).map(parseFloat);

	const produced = filter(/Producing tuple for storm ([0-9]*)$/);
	const started = filter(/Started working on ([0-9]*)$/);
	const acked = filter(/Emit and ack ([0-9]*)$/);
	const emited = filter(/Producing messages for ActiveMQ ([0-9]*)$/);

	console.log(produced.length);
	console.log(started.length);
	console.log(acked.length);
	console.log(emited.length);

	console.log(logLines.filter(line => line.match(/\+ \+/g)));
});