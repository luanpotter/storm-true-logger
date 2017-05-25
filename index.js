const process = require('process');

const exec = require('child_process').exec;
const execute = (command, callback) => exec(command, {maxBuffer: 1024 * 1024 * 500}, (stderr, stdout) => callback(stdout, stderr));

const express = require('express');
const app = express();

const topology = process.argv[2];
const logFolder = `/var/log/storm/workers-artifacts/${topology}-*/**/*`;
const port = 7472;

app.get('/logs', (req, res) => execute(`cat ${logFolder} | grep '\\[INFO\\] +'`, d => res.send(d)));
app.get('/filter', (req, res) => execute(`cat ${logFolder} | grep '${req.query.q}'`, d => res.send(d)));
app.get('/files', (req, res) => execute(`ls -la ${logFolder}`, d => res.send(d)));
app.get('/clear', (req, res) => execute(`sudo rm -rf ${logFolder}`, (_, b) => res.send(!b ? 'Deleted!' : 'Error: ' + b)));

app.listen(port, () => console.log(`storm-true-logger listening on port ${port}!`));
