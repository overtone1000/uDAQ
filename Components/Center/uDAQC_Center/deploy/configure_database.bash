#!/bin/bash

echo "Configuring PostreSQL/TimescaleDB database."

echo "Creating udaqc user."
sudo useradd -M udaqc
sudo usermod -L udaqc
echo udaqc:udaqc | sudo chpasswd

echo "Choose a directory in the file system for the uDAQC database: "
read
database_dir="$REPLY"
echo "Installing directory at $database_dir"

sudo mkdir "$database_dir"
sudo chown "$database_dir"
sudo chgrp "$database_dir"
sudo chmod 700 "$database_dir"

sudo -u postgres psql -c "create user udaqc with password 'udaqc';"
sudo -u postgres psql -c "create tablespace udaqc_tablespace location '/alt/postgres/datadirectory';"
sudo -u postgres psql -c "create database udaqc_database with tablespace = udaqc_tablespace;"
sudo -u postgres psql -d udaqc_database -c "create extension if not exists timescaledb cascade;"
sudo -u postgres psql -c "grant all privileges on database udaqc_database to udaqc;"

sudo timescaledb-tune
sudo service postgresql restart
