#!/bin/bash

###############################################################################
# SomniAI Frontend - 자동 설치 및 실행 스크립트
# 모든 서비스를 셋업하고 실행합니다 (Docker 또는 Kubernetes)
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker}"  # docker or k8s
NAMESPACE="${NAMESPACE:-somniai}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          🧠 SomniAI Auto Setup Script              ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}\n"
}

print_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    print_success "$1 is installed"
    return 0
}

###############################################################################
# Prerequisite Checks
###############################################################################

check_prerequisites() {
    print_step "Checking prerequisites..."

    local all_ok=true

    if [ "$DEPLOYMENT_MODE" == "docker" ]; then
        check_command docker || all_ok=false
        check_command docker-compose || all_ok=false
    elif [ "$DEPLOYMENT_MODE" == "k8s" ]; then
        check_command kubectl || all_ok=false
        check_command docker || all_ok=false
    fi

    check_command node || all_ok=false
    check_command npm || all_ok=false

    if [ "$all_ok" = false ]; then
        print_error "Missing required dependencies. Please install them first."
        exit 1
    fi

    print_success "All prerequisites satisfied"
}

###############################################################################
# Environment Setup
###############################################################################

setup_environment() {
    print_step "Setting up environment files..."

    # Create .env for frontend if not exists
    if [ ! -f .env ]; then
        print_warning ".env not found, creating from .env.example..."
        cp .env.example .env
        print_success "Created .env"
    else
        print_success ".env already exists"
    fi

    # Create .env for backend if not exists
    if [ ! -f server/.env ]; then
        print_warning "server/.env not found, creating from server/.env.example..."
        cp server/.env.example server/.env
        print_success "Created server/.env"
    else
        print_success "server/.env already exists"
    fi
}

###############################################################################
# Build Images
###############################################################################

build_docker_images() {
    print_step "Building Docker images..."

    print_step "Building backend image..."
    docker build -t somniai-backend:latest -f server/Dockerfile server/
    print_success "Backend image built"

    print_step "Building frontend image..."
    docker build -t somniai-frontend:latest -f Dockerfile.frontend .
    print_success "Frontend image built"
}

###############################################################################
# Docker Deployment
###############################################################################

deploy_docker() {
    print_step "Deploying with Docker Compose..."

    # Stop existing containers
    print_step "Stopping existing containers..."
    docker-compose down 2>/dev/null || true

    # Build images
    build_docker_images

    # Start services
    print_step "Starting services..."
    docker-compose up -d

    print_success "Docker services started"

    # Wait for services to be ready
    print_step "Waiting for services to be ready..."
    sleep 5

    # Check service health
    check_docker_health
}

check_docker_health() {
    print_step "Checking service health..."

    local services=("somniai-nginx" "somniai-frontend" "somniai-backend" "somniai-redis" "somniai-mosquitto")

    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
            print_success "$service is running"
        else
            print_warning "$service is not running yet"
        fi
    done
}

###############################################################################
# Kubernetes Deployment
###############################################################################

deploy_kubernetes() {
    print_step "Deploying to Kubernetes..."

    # Create namespace if not exists
    print_step "Creating namespace: $NAMESPACE..."
    kubectl create namespace $NAMESPACE 2>/dev/null || print_warning "Namespace already exists"

    # Build and push images (for production, push to registry)
    build_docker_images

    # Apply Kubernetes manifests
    print_step "Applying Kubernetes manifests..."

    kubectl apply -f k8s/base/namespace.yaml
    kubectl apply -f k8s/base/configmap.yaml
    kubectl apply -f k8s/base/secrets.yaml
    kubectl apply -f k8s/base/persistent-volumes.yaml
    kubectl apply -f k8s/base/redis-deployment.yaml
    kubectl apply -f k8s/base/mosquitto-deployment.yaml
    kubectl apply -f k8s/base/backend-deployment.yaml
    kubectl apply -f k8s/base/frontend-deployment.yaml
    kubectl apply -f k8s/base/nginx-deployment.yaml

    print_success "Kubernetes manifests applied"

    # Wait for deployments
    print_step "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment --all -n $NAMESPACE

    print_success "All deployments ready"

    # Check pod status
    check_k8s_health
}

check_k8s_health() {
    print_step "Checking Kubernetes pod health..."

    kubectl get pods -n $NAMESPACE

    print_step "\nChecking services..."
    kubectl get svc -n $NAMESPACE
}

###############################################################################
# Installation
###############################################################################

install_dependencies() {
    print_step "Installing dependencies..."

    # Install frontend dependencies
    if [ ! -d "node_modules" ]; then
        print_step "Installing frontend dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies already installed"
    fi

    # Install backend dependencies
    if [ ! -d "server/node_modules" ]; then
        print_step "Installing backend dependencies..."
        cd server && npm install && cd ..
        print_success "Backend dependencies installed"
    else
        print_success "Backend dependencies already installed"
    fi
}

###############################################################################
# Status Check
###############################################################################

show_status() {
    print_header

    if [ "$DEPLOYMENT_MODE" == "docker" ]; then
        echo -e "${GREEN}Deployment Mode: Docker Compose${NC}\n"
        docker-compose ps

        echo -e "\n${BLUE}Service URLs:${NC}"
        echo -e "  Frontend:  ${GREEN}http://localhost${NC}"
        echo -e "  API:       ${GREEN}http://localhost/api${NC}"
        echo -e "  Health:    ${GREEN}http://localhost/api/health${NC}"

    elif [ "$DEPLOYMENT_MODE" == "k8s" ]; then
        echo -e "${GREEN}Deployment Mode: Kubernetes${NC}\n"
        kubectl get all -n $NAMESPACE

        echo -e "\n${BLUE}Access Services:${NC}"
        echo -e "  Run: ${YELLOW}kubectl port-forward -n $NAMESPACE svc/nginx 8080:80${NC}"
        echo -e "  Then access: ${GREEN}http://localhost:8080${NC}"
    fi

    echo -e "\n${BLUE}Useful Commands:${NC}"
    if [ "$DEPLOYMENT_MODE" == "docker" ]; then
        echo -e "  View logs:        ${YELLOW}docker-compose logs -f${NC}"
        echo -e "  Stop services:    ${YELLOW}docker-compose down${NC}"
        echo -e "  Restart service:  ${YELLOW}docker-compose restart <service>${NC}"
    else
        echo -e "  View logs:        ${YELLOW}kubectl logs -n $NAMESPACE -l app=<service>${NC}"
        echo -e "  View pods:        ${YELLOW}kubectl get pods -n $NAMESPACE${NC}"
        echo -e "  Describe pod:     ${YELLOW}kubectl describe pod -n $NAMESPACE <pod-name>${NC}"
    fi
}

###############################################################################
# Cleanup
###############################################################################

cleanup() {
    print_step "Cleaning up..."

    if [ "$DEPLOYMENT_MODE" == "docker" ]; then
        docker-compose down -v
        print_success "Docker services stopped and volumes removed"
    elif [ "$DEPLOYMENT_MODE" == "k8s" ]; then
        kubectl delete namespace $NAMESPACE
        print_success "Kubernetes namespace deleted"
    fi
}

###############################################################################
# Main Script
###############################################################################

main() {
    print_header

    # Parse command line arguments
    case "${1:-}" in
        start)
            check_prerequisites
            setup_environment
            install_dependencies

            if [ "$DEPLOYMENT_MODE" == "docker" ]; then
                deploy_docker
            elif [ "$DEPLOYMENT_MODE" == "k8s" ]; then
                deploy_kubernetes
            else
                print_error "Invalid DEPLOYMENT_MODE: $DEPLOYMENT_MODE"
                exit 1
            fi

            show_status
            ;;

        stop)
            cleanup
            ;;

        status)
            show_status
            ;;

        restart)
            cleanup
            sleep 2
            main start
            ;;

        logs)
            if [ "$DEPLOYMENT_MODE" == "docker" ]; then
                docker-compose logs -f
            else
                kubectl logs -n $NAMESPACE -l app=${2:-backend} -f
            fi
            ;;

        build)
            build_docker_images
            ;;

        *)
            echo "Usage: $0 {start|stop|status|restart|logs|build}"
            echo ""
            echo "Commands:"
            echo "  start    - Install dependencies and start all services"
            echo "  stop     - Stop and cleanup all services"
            echo "  status   - Show current status"
            echo "  restart  - Restart all services"
            echo "  logs     - Show logs (Docker: all, K8s: specify service)"
            echo "  build    - Build Docker images only"
            echo ""
            echo "Environment Variables:"
            echo "  DEPLOYMENT_MODE - 'docker' or 'k8s' (default: docker)"
            echo "  NAMESPACE       - Kubernetes namespace (default: somniai)"
            echo ""
            echo "Examples:"
            echo "  ./run.sh start                    # Start with Docker"
            echo "  DEPLOYMENT_MODE=k8s ./run.sh start  # Start with Kubernetes"
            echo "  ./run.sh logs backend              # Show backend logs (K8s)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
