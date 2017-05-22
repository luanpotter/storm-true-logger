#!/bin/bash

machine=$1
topology=$2

yarn run pack

gcloud compute ssh ambari@$machine -- "ps aux | grep \"[s]torm-true-logger\" | awk '{ print $2; }' | xargs kill -9"
gcloud compute copy-files dist ambari@$machine:/home/ambari/storm-true-logger
ip=`gcloud compute instances list | grep $machine | awk '{ print $(NF-1) }'`
ssh -i ~/.ssh/google_compute_engine ambari@$ip -C "/home/ambari/storm-true-logger"

# you can ctrl+c after it runs
