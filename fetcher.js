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

const machines = process.argv.slice(2);
const ips_p = machines.map(machine => execute(`gcloud compute instances list | grep ${machine} | awk '{ print $(NF-1) }'`));

Promise.all(ips_p).then(ips => {
	const logs = ips.map(ip => request('http://' + ip.trim() + ':7472/filter?q=%5C%5BNEW%5C%5D'));
	Promise.all(logs).then(data => {
		log('- Machines:');
		data.map((datum, i) => machines[i] + ' (' + ips[i].trim() + ') alive and ' + datum.length + ' lines received.').forEach(log);

		const logLines = _.flatten(data.map(el => el.split('\n'))); //.filter(line => line.match(/\+ \+/g));
		let fabito = logLines.filter(line => !line.match(/Recovery period/));
		console.log(fabito);
		console.log(fabito.length);

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

		log('- Heat Map:');
		let heatMap = states.map(state => state[2]);
		let max = _.max(_.flatten(heatMap));
		let map = _.range(0, max + 1).map(i => heatMap.filter(e => e.includes(i)).length);
		const colors = { 0: 'white', 1: 'red', 5: 'green' };
		console.log('[' + map.filter(e => e === 5).length + '/' + max + ']');
		// console.log(map.map(qtd => chalk[colors[qtd] || 'blue']('.')).join(''));

		fs.writeFileSync('log.dat', logLines.join('\n'));
	});
})
