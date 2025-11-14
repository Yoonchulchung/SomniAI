#!/bin/bash

###############################################################################
# Health Check Script
# Checks the health of all services
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker}"
NAMESPACE="${NAMESPACE:-somniai}"

echo "🏥 Health Check - Mode: $DEPLOYMENT_MODE"
echo "================================"

check_http_endpoint() {
    local url=$1
    local name=$2

    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $name is unhealthy${NC}"
        return 1
    fi
}

if [ "$DEPLOYMENT_MODE" == "docker" ]; then
    echo -e "\nChecking Docker services..."

    # Check if containers are running
    if docker ps --format "{{.Names}}" | grep -q "somniai-"; then
        echo -e "${GREEN}✓ Docker containers are running${NC}"
    else
        echo -e "${RED}✗ No Docker containers found${NC}"
        exit 1
    fi

    # Check endpoints
    check_http_endpoint "http://localhost/health" "Nginx"
    check_http_endpoint "http://localhost/api/health" "Backend API"
    check_http_endpoint "http://localhost" "Frontend"

    # Check Redis
    if docker exec somniai-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo -e "${GREEN}✓ Redis is healthy${NC}"
    else
        echo -e "${RED}✗ Redis is unhealthy${NC}"
    fi

    # Check MQTT
    if docker exec somniai-mosquitto mosquitto_sub -t 'test' -C 1 -W 1 2>/dev/null; then
        echo -e "${GREEN}✓ MQTT Mosquitto is healthy${NC}"
    else
        echo -e "${YELLOW}⚠ MQTT Mosquitto check skipped${NC}"
    fi

elif [ "$DEPLOYMENT_MODE" == "k8s" ]; then
    echo -e "\nChecking Kubernetes services..."

    # Check if namespace exists
    if kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Namespace $NAMESPACE exists${NC}"
    else
        echo -e "${RED}✗ Namespace $NAMESPACE not found${NC}"
        exit 1
    fi

    # Check pod status
    echo -e "\nPod Status:"
    kubectl get pods -n $NAMESPACE

    # Check if all pods are running
    NOT_RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [ "$NOT_RUNNING" -eq 0 ]; then
        echo -e "${GREEN}✓ All pods are running${NC}"
    else
        echo -e "${RED}✗ $NOT_RUNNING pods are not running${NC}"
    fi

    # Check deployments
    echo -e "\nDeployment Status:"
    kubectl get deployments -n $NAMESPACE

    # Check services
    echo -e "\nService Status:"
    kubectl get services -n $NAMESPACE

fi

echo -e "\n================================"
echo "Health check complete!"
