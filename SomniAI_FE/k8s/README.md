# Kubernetes Deployment for SomniAI

This directory contains Kubernetes manifests for deploying the SomniAI application.

## 🏗️ Architecture

The application is deployed as microservices in Kubernetes:

```
┌─────────────────────────────────────────────────────┐
│              Nginx Service (NodePort)               │
│                   Port 30080                        │
└────────────┬─────────────────────────────┬──────────┘
             │                             │
             ▼                             ▼
    ┌────────────────┐          ┌──────────────────┐
    │  Frontend Pods │          │  Backend Pods    │
    │  (Replicas: 2) │          │  (Replicas: 2)   │
    └────────────────┘          └─────────┬─────────┘
                                          │
                                ┌─────────┴─────────┐
                                ▼                   ▼
                        ┌──────────────┐    ┌──────────────┐
                        │  Redis Pod   │    │ Mosquitto Pod│
                        │  (Replicas:1)│    │ (Replicas: 1)│
                        └──────────────┘    └──────────────┘
```

## 📁 Directory Structure

```
k8s/
├── base/                          # Base manifests
│   ├── namespace.yaml            # Namespace definition
│   ├── configmap.yaml            # Application configuration
│   ├── secrets.yaml              # Sensitive data
│   ├── persistent-volumes.yaml   # Storage for Redis & MQTT
│   ├── redis-deployment.yaml     # Redis cache
│   ├── mosquitto-deployment.yaml # MQTT broker
│   ├── backend-deployment.yaml   # Node.js API
│   ├── frontend-deployment.yaml  # Next.js app
│   └── nginx-deployment.yaml     # Reverse proxy
└── overlays/                     # Environment-specific configs
    ├── dev/                      # Development
    └── prod/                     # Production
```

## 🚀 Quick Start

### Using run.sh Script (Recommended)

```bash
# Start with Kubernetes
DEPLOYMENT_MODE=k8s ./run.sh start

# Check status
./run.sh status

# View logs
./run.sh logs backend

# Stop all services
./run.sh stop
```

### Manual Deployment

1. **Create namespace:**
   ```bash
   kubectl create namespace somniai
   ```

2. **Apply all manifests:**
   ```bash
   kubectl apply -f k8s/base/
   ```

3. **Wait for deployments:**
   ```bash
   kubectl wait --for=condition=available --timeout=300s \
     deployment --all -n somniai
   ```

4. **Check status:**
   ```bash
   kubectl get all -n somniai
   ```

## 🔧 Configuration

### Environment Variables

Edit `k8s/base/configmap.yaml` to change configuration:

```yaml
data:
  NODE_ENV: "production"
  PORT: "4000"
  REDIS_URL: "redis://redis-service:6379"
  MQTT_BROKER: "mqtt://mosquitto-service:1883"
```

### Secrets

Edit `k8s/base/secrets.yaml` for sensitive data:

```yaml
stringData:
  REDIS_PASSWORD: "your-password"
  MQTT_USERNAME: "your-username"
  MQTT_PASSWORD: "your-password"
```

## 🔄 Auto-Restart & Self-Healing

Each deployment includes:

### 1. **Liveness Probe**
- Checks if container is alive
- Restarts container if fails
- Example (Backend):
  ```yaml
  livenessProbe:
    httpGet:
      path: /api/health
      port: 4000
    initialDelaySeconds: 30
    periodSeconds: 10
    failureThreshold: 3
  ```

### 2. **Readiness Probe**
- Checks if container is ready for traffic
- Removes from service if fails
- Example (Backend):
  ```yaml
  readinessProbe:
    httpGet:
      path: /api/health
      port: 4000
    initialDelaySeconds: 10
    periodSeconds: 5
    failureThreshold: 2
  ```

### 3. **Restart Policy**
```yaml
restartPolicy: Always
```

### 4. **Multiple Replicas**
- Frontend: 2 replicas
- Backend: 2 replicas
- Nginx: 2 replicas

If one pod crashes, traffic is automatically routed to healthy pods.

## 📊 Monitoring

### View Pod Status
```bash
kubectl get pods -n somniai
```

### View Logs
```bash
# Backend logs
kubectl logs -n somniai -l app=backend -f

# Frontend logs
kubectl logs -n somniai -l app=frontend -f

# Redis logs
kubectl logs -n somniai -l app=redis -f

# All pods
kubectl logs -n somniai --all-containers=true -f
```

### Describe Pod (for debugging)
```bash
kubectl describe pod -n somniai <pod-name>
```

### Check Events
```bash
kubectl get events -n somniai --sort-by='.lastTimestamp'
```

## 🌐 Accessing the Application

### NodePort (Default)
```bash
# Access via NodePort (30080)
curl http://localhost:30080
```

### Port Forwarding
```bash
# Forward to local port
kubectl port-forward -n somniai svc/nginx-service 8080:80

# Then access
curl http://localhost:8080
```

### LoadBalancer (Cloud environments)
```bash
# Change service type in nginx-deployment.yaml
spec:
  type: LoadBalancer  # Instead of NodePort

# Get external IP
kubectl get svc -n somniai nginx-service
```

## 📈 Scaling

### Manual Scaling
```bash
# Scale backend to 3 replicas
kubectl scale deployment backend -n somniai --replicas=3

# Scale frontend to 4 replicas
kubectl scale deployment frontend -n somniai --replicas=4
```

### Auto-Scaling (HPA)
```bash
# Create Horizontal Pod Autoscaler
kubectl autoscale deployment backend -n somniai \
  --cpu-percent=70 \
  --min=2 \
  --max=10
```

## 🔄 Updates & Rollbacks

### Update Image
```bash
# Update backend image
kubectl set image deployment/backend -n somniai \
  backend=somniai-backend:v2

# Watch rollout
kubectl rollout status deployment/backend -n somniai
```

### Rollback
```bash
# Undo last deployment
kubectl rollout undo deployment/backend -n somniai

# Rollback to specific revision
kubectl rollout undo deployment/backend -n somniai --to-revision=2
```

### Rollout History
```bash
kubectl rollout history deployment/backend -n somniai
```

## 💾 Persistent Storage

### View Persistent Volumes
```bash
kubectl get pv -n somniai
kubectl get pvc -n somniai
```

### Check Storage Usage
```bash
kubectl exec -n somniai <redis-pod> -- df -h /data
```

## 🧹 Cleanup

### Delete Everything
```bash
# Using run.sh
./run.sh stop

# Or manually
kubectl delete namespace somniai
```

### Delete Specific Resources
```bash
# Delete deployment
kubectl delete deployment backend -n somniai

# Delete service
kubectl delete service backend-service -n somniai
```

## 🛠️ Troubleshooting

### Pod Not Starting
```bash
# Check pod events
kubectl describe pod -n somniai <pod-name>

# Check logs
kubectl logs -n somniai <pod-name>

# Get pod YAML
kubectl get pod -n somniai <pod-name> -o yaml
```

### Service Not Accessible
```bash
# Check service endpoints
kubectl get endpoints -n somniai

# Test service from another pod
kubectl run -n somniai test-pod --rm -it --image=busybox -- sh
# Inside pod:
wget -O- http://backend-service:4000/api/health
```

### Resource Issues
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n somniai

# Check resource limits
kubectl describe pod -n somniai <pod-name>
```

### Restart All Pods
```bash
kubectl rollout restart deployment -n somniai
```

## 📋 Health Check Endpoints

- **Nginx**: `GET /health` → 200 OK
- **Backend**: `GET /api/health` → JSON response
- **Frontend**: `GET /` → HTML response
- **Redis**: `redis-cli ping` → PONG
- **Mosquitto**: TCP check on port 1883

## 🔐 Security Best Practices

1. **Use secrets for sensitive data**
   ```bash
   kubectl create secret generic db-secret \
     --from-literal=password=mysecretpassword \
     -n somniai
   ```

2. **Enable RBAC**
   ```bash
   kubectl create serviceaccount somniai-sa -n somniai
   ```

3. **Network Policies** (optional)
   ```bash
   kubectl apply -f network-policy.yaml
   ```

4. **Resource Limits** - Already configured in deployments

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

## 🆘 Support

For issues or questions:
1. Check pod logs: `kubectl logs -n somniai <pod-name>`
2. Check events: `kubectl get events -n somniai`
3. Review configuration: `kubectl get configmap -n somniai -o yaml`
