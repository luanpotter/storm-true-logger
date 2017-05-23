const process = require('process');
const promisify = require('promisify-node');

const log = x => { console.log(x); return x; };

const request = require('request-promise-native');
const _ = require('lodash');

const exec = require('child_process').exec;
const execute = promisify(function (command, callback) { exec(command, (_, stdout) => callback(null, stdout)) });
const extract = (haystack, needle) => needle.exec(haystack)[1];

const machines = process.argv.slice(2);
const ips_p = machines.map(machine => execute(`gcloud compute instances list | grep ${machine} | awk '{ print $(NF-1) }'`));

Promise.all(ips_p).then(ips => {
	const logs = ips.map(ip => request('http://' + ip.trim() + ':7472/logs'));
	Promise.all(logs).then(data => {
		log('- Machines:');
		data.map((datum, i) => ips[i] + ' alive and ' + datum.length + ' lines received.').forEach(log);

		const logLines = _.flatten(data.map(el => el.split('\n'))).filter(line => line.match(/\+ \+/g));
		const filter = regex => logLines.filter(line => line.match(regex)).map(line => extract(line, regex)).map(parseFloat);

		log('- Messages:');
		log('Produced : ' + filter(/Producing tuple for storm ([0-9]*)$/).length);
		log('Started : ' + filter(/Started working on ([0-9]*)$/).length);
		log('Finished : ' + filter(/Finished working on ([0-9]*)$/).length);
		log('Acked : ' + filter(/Emit and ack ([0-9]*)$/).length);
		log('Emited : ' + filter(/Producing messages for ActiveMQ ([0-9]*)$/).length);
	});
})
