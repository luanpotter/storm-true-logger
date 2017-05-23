const process = require('process');

const exec = require('child_process').exec;
const execute = (command, callback) => exec(command, (_, stdout) => callback(stdout));

const express = require('express');
const app = express();

const topology = process.argv[2];
const logFolder = `/var/log/storm/workers-artifacts/${topology}-*/**/*`;
const port = 7472;

app.get('/logs', (req, res) => execute(`cat ${logFolder} | grep '\\[INFO\\] +'`, d => res.send(d)));
app.get('/filter', (req, res) => execute(`cat ${logFolder} | grep '${req.query.q}'`, d => res.send(d)));
app.get('/files', (req, res) => execute(`ls -la ${logFolder}`, d => res.send(d)));

app.listen(port, () => console.log(`storm-true-logger listening on port ${port}!`));
