sudo apt update

sudo apt install -y mosquitto mosquitto-clients

sudo systemctl enable mosquitto
sudo systemctl start mosquitto
sudo systemctl status mosquitto

curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc

sudo apt install npm -y

npm install -g pm2

cd app/public_fe

npm i

pm2 start npm --name "next-frontend" -- run start:prod

cd app/public_be_nest

pnpm run build

pm2 start dist/main.js --name backend-api