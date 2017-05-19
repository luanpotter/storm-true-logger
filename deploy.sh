#!/bin/bash

machine=$1
topology=$2

yarn run pack

gcloud compute ssh ambari@$machine -- "ps aux | grep \"[s]torm-true-logger\" | awk '{ print $2; }' | xargs kill -9"
gcloud compute copy-files dist ambari@$machine:/home/ambari/storm-true-logger
gcloud compute ssh ambari@$machine -- "./storm-true-logger $topology &"
