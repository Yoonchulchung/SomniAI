#############################################################
# LAB 414 Docker Compose Starter
# Created By Yoonchul Chung
# Created At 2024.08.06
# Welcome to Visit Github : https://github.com/Yoonchulchung
#############################################################

initiate_docker_compose()
{
  clear
  figlet WELOCME TO 
  figlet LAB 414
  docker compose up 2>&1 | tee docker-compose.log
}

initiate_docker_compose
