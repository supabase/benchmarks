#!/bin/bash
set -x

sudo apt update

# Install nodejs
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install v18.14.2

# Install golang and xk6
curl -OL https://go.dev/dl/go1.22.0.linux-arm64.tar.gz
sudo tar -C /usr/local -xvf go1.22.0.linux-arm64.tar.gz
sudo nano ~/.profile
export PATH=$PATH:/usr/local/go/bin
export PATH=$PATH:$HOME/go/bin
source ~/.profile
go version
go env -w GO111MODULE=auto
go install go.k6.io/xk6/cmd/xk6@latest

# Install telegraf
wget -q https://repos.influxdata.com/influxdata-archive_compat.key
sudo apt-get install gpg

echo '393e8779c89ac8d958f81f942f9ad7fb82a25e133faddaf92e15b16e6ac9ce4c influxdata-archive_compat.key' | sha256sum -c && cat influxdata-archive_compat.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg > /dev/null

echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive_compat.gpg] https://repos.influxdata.com/debian stable main' | sudo tee /etc/apt/sources.list.d/influxdata.list

sudo apt-get update && sudo apt-get install telegraf

# Install make
sudo apt install make

# Increase file descriptor limit and port range for load testing
ulimit -n 250000
echo "ulimit -n 250000" >> ~/.bashrc
sudo sysctl -w net.ipv4.ip_local_port_range="16384 65000"
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
sudo sysctl -w net.ipv4.tcp_timestamps=1