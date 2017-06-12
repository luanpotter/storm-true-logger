const process = require('process');
const fs = require('fs');
const promisify = require('promisify-node');

const log = x => { console.log(x); return x; };

const request = require('request-promise-native');
const _ = require('lodash');
const chalk = require('chalk');

const exec = require('child_process').exec;
const execute = promisify(function (command, callback) { exec(command, (_, stdout) => callback(null, stdout)) });
const extract = (haystack, needle) => needle.exec(haystack)[1];

let verbose = false;
if (process.argv[2] === 'v') {
	process.argv.splice(2, 1);
	verbose = true;
}

let clear = false;
if (process.argv[2] === 'clear') {
	process.argv.splice(2, 1);
	clear = true;
}

const machines = process.argv.slice(2);
const ips_p = machines.map(machine => execute(`gcloud compute instances list | grep ${machine} | awk '{ print $(NF-1) }'`));

Promise.all(ips_p).then(ips => {
	if (clear) {
		Promise.all(ips.map(ip => request('http://' + ip.trim() + ':7472/clear'))).then(data => {
			console.log('Done!');
			console.log(data);
		});
		return;
	}
	const logs = ips.map(ip => request('http://' + ip.trim() + ':7472/logs'));
	Promise.all(logs).then(data => {
		log('- Machines:');
		data.map((datum, i) => machines[i] + ' (' + ips[i].trim() + ') alive and ' + datum.length + ' lines received.').forEach(log);
		const logLines = _.flatten(data.map(el => el.split('\n'))).filter(line => line.match(/\+ \+ Committing/g));
		console.log(logLines); process.exit(0);
		const filter = regex => logLines.filter(line => line.match(regex)).map(line => extract(line, regex)).map(parseFloat);

		const states = [
			['Produced', /Producing tuple for storm ([0-9]*)/],
			['Started', /Started working on ([0-9]*)/],
			['Finished', /Finished working on ([0-9]*)/],
			['Acked', /Emit and ack ([0-9]*)/],
			['Emited', /Producing messages for ActiveMQ ([0-9]*)/],
		];
		states.forEach(state => state.push(filter(state[1])));

		log('- Messages:');
		states.forEach(state => log(state[0] + ' : ' + state[2].length));

		let gap = states[0][2].length - states[1][2].length;
		console.log('Spout-Boltzmann Gap: ' + gap);

		log('- Heat Map:');
		let heatMap = states.map(state => state[2]);
		let max = _.max(_.flatten(heatMap));
		let map = _.range(0, max + 1).map(i => heatMap.filter(e => e.includes(i)).length);
		const colors = { 0: 'white', 1: 'red', 5: 'green' };
		console.log('[' + map.filter(e => e === 5).length + '/' + max + ']');
		if (verbose) console.log(map.map(qtd => chalk[colors[qtd] || 'blue']('.')).join(''));

		fs.writeFileSync('log.dat', logLines.join('\n'));
	});
})
