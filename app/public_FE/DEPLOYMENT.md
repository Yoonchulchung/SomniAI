# SomniAI Deployment Guide

Complete deployment guide for SomniAI using Docker or Kubernetes.

## 🎯 Quick Start

### Option 1: Docker Compose (Easiest)

```bash
# Start everything
./run.sh start

# Check status
./run.sh status

# View logs
./run.sh logs

# Stop everything
./run.sh stop
```

### Option 2: Kubernetes

```bash
# Start with Kubernetes
DEPLOYMENT_MODE=k8s ./run.sh start

# Check status
kubectl get all -n somniai

# Access application
kubectl port-forward -n somniai svc/nginx-service 8080:80
```

## 📋 Prerequisites

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+
- npm 10+

### For Kubernetes Deployment
- kubectl 1.25+
- Kubernetes cluster (minikube, k3s, or cloud provider)
- Docker 20.10+
- Node.js 20+

## 🔧 Installation Steps

### 1. Clone Repository
```bash
cd SomniAI_FE
```

### 2. Environment Setup
```bash
# Create environment files
cp .env.example .env
cp server/.env.example server/.env

# Edit as needed
nano .env
nano server/.env
```

### 3. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### 4. Deploy

#### Docker:
```bash
./run.sh start
```

#### Kubernetes:
```bash
DEPLOYMENT_MODE=k8s ./run.sh start
```

## 🏗️ Architecture Components

### Services

| Service | Port | Description | Replicas (K8s) |
|---------|------|-------------|----------------|
| Nginx | 80 | Reverse proxy & load balancer | 2 |
| Frontend | 3000 | Next.js application | 2 |
| Backend | 4000 | Node.js API server | 2 |
| Redis | 6379 | Cache & session store | 1 |
| Mosquitto | 1883, 9001 | MQTT broker | 1 |

### Auto-Restart Features

**Docker Compose:**
- `restart: unless-stopped` policy
- Automatic restart on failure
- Health checks for all services

**Kubernetes:**
- Liveness probes (restart on failure)
- Readiness probes (remove from load balancer)
- Multiple replicas for high availability
- Self-healing: pods restart automatically
- Rolling updates with zero downtime

### Health Checks

**Backend API:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

**Redis:**
```yaml
livenessProbe:
  exec:
    command: ["redis-cli", "ping"]
  periodSeconds: 10
```

## 🔄 Common Operations

### View Logs

**Docker:**
```bash
# All services
./run.sh logs

# Specific service
docker-compose logs -f backend
```

**Kubernetes:**
```bash
# All pods
kubectl logs -n somniai --all-containers=true -f

# Specific service
kubectl logs -n somniai -l app=backend -f
```

### Restart Services

**Docker:**
```bash
# Restart all
./run.sh restart

# Restart specific service
docker-compose restart backend
```

**Kubernetes:**
```bash
# Restart all deployments
kubectl rollout restart deployment -n somniai

# Restart specific deployment
kubectl rollout restart deployment backend -n somniai
```

### Update Application

**Docker:**
```bash
# Rebuild and restart
./run.sh build
docker-compose up -d --build
```

**Kubernetes:**
```bash
# Build new image
docker build -t somniai-backend:v2 -f server/Dockerfile server/

# Update deployment
kubectl set image deployment/backend -n somniai backend=somniai-backend:v2

# Watch rollout
kubectl rollout status deployment/backend -n somniai
```

### Scale Services (Kubernetes only)

```bash
# Scale backend to 5 replicas
kubectl scale deployment backend -n somniai --replicas=5

# Auto-scale based on CPU
kubectl autoscale deployment backend -n somniai \
  --cpu-percent=70 --min=2 --max=10
```

## 🌐 Accessing the Application

### Docker

- **Frontend**: http://localhost
- **API**: http://localhost/api
- **Health Check**: http://localhost/api/health

### Kubernetes

**Option 1: NodePort (default)**
```bash
# Access via node IP and port 30080
curl http://<node-ip>:30080
```

**Option 2: Port Forward**
```bash
# Forward to localhost
kubectl port-forward -n somniai svc/nginx-service 8080:80

# Access
curl http://localhost:8080
```

**Option 3: LoadBalancer (cloud)**
```bash
# Get external IP
kubectl get svc -n somniai nginx-service

# Access via external IP
curl http://<external-ip>
```

## 🐛 Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs <service-name>

# Check container status
docker ps -a

# Recreate container
docker-compose up -d --force-recreate <service-name>
```

**Port conflicts:**
```bash
# Check what's using the port
lsof -i :80
lsof -i :3000

# Change port in docker-compose.yml
```

### Kubernetes Issues

**Pod not starting:**
```bash
# Check pod status
kubectl describe pod -n somniai <pod-name>

# Check logs
kubectl logs -n somniai <pod-name>

# Delete and recreate
kubectl delete pod -n somniai <pod-name>
```

**Service not accessible:**
```bash
# Check endpoints
kubectl get endpoints -n somniai

# Check service
kubectl describe service -n somniai <service-name>

# Test from inside cluster
kubectl run -n somniai test --rm -it --image=busybox -- sh
# Then: wget -O- http://backend-service:4000/api/health
```

**Image pull errors:**
```bash
# If using local images, make sure they're available
docker images | grep somniai

# For minikube, use minikube's Docker daemon
eval $(minikube docker-env)
docker build -t somniai-backend:latest -f server/Dockerfile server/
```

## 📊 Monitoring

### Docker

```bash
# Resource usage
docker stats

# Service status
docker-compose ps
```

### Kubernetes

```bash
# Pod status
kubectl get pods -n somniai

# Resource usage
kubectl top pods -n somniai
kubectl top nodes

# Events
kubectl get events -n somniai --sort-by='.lastTimestamp'

# Dashboard (if available)
kubectl proxy
# Then visit http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## 🔐 Security Checklist

- [ ] Change default passwords in secrets
- [ ] Use environment-specific configurations
- [ ] Enable TLS/SSL for production
- [ ] Configure network policies (K8s)
- [ ] Set resource limits
- [ ] Enable RBAC (K8s)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## 🧹 Cleanup

### Docker
```bash
# Stop and remove containers, networks
./run.sh stop

# Remove volumes as well
docker-compose down -v

# Remove images
docker rmi somniai-backend somniai-frontend
```

### Kubernetes
```bash
# Remove everything
./run.sh stop

# Or manually
kubectl delete namespace somniai

# Remove persistent volumes
kubectl delete pv --all
```

## 📈 Performance Tuning

### Docker

1. **Increase resource limits** in docker-compose.yml:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

2. **Enable BuildKit**:
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

### Kubernetes

1. **Adjust resource requests/limits** in deployments
2. **Enable horizontal pod autoscaling**
3. **Use node affinity** for optimal pod placement
4. **Configure persistent volume performance**

## 🎓 Next Steps

1. **Production Setup**
   - Configure domain and SSL
   - Set up monitoring (Prometheus/Grafana)
   - Configure logging (ELK stack)
   - Set up CI/CD pipeline

2. **Advanced Features**
   - Blue-green deployments
   - Canary releases
   - A/B testing
   - Multi-region deployment

## 📚 Additional Documentation

- [Architecture Documentation](./README_ARCHITECTURE.md)
- [Kubernetes Guide](./k8s/README.md)
- [API Documentation](./server/README.md)

## 🆘 Getting Help

If you encounter issues:

1. Check the logs first
2. Review the troubleshooting section
3. Check GitHub issues
4. Contact: Yoonchul005@gmail.com
