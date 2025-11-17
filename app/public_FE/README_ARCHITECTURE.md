# SomniAI Frontend Architecture

Efficient architecture with Node.js, Nginx, Redis, and MQTT integration.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Port 80)                      │
│                  Reverse Proxy & Load Balancer               │
└────────────┬─────────────────────────────────┬──────────────┘
             │                                 │
             ▼                                 ▼
    ┌────────────────┐                ┌──────────────────┐
    │  Next.js (3000)│                │ Node.js API (4000)│
    │   Frontend     │◄───────────────┤   Express Server  │
    └────────────────┘                └─────────┬─────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                            ┌──────────────┐      ┌──────────────┐
                            │ Redis (6379) │      │ MQTT (1883)  │
                            │ Cache/Session│      │ Mosquitto    │
                            └──────────────┘      └──────────────┘
```

## 📁 Project Structure

```
SomniAI_FE/
├── app/                    # Next.js app directory
│   ├── (main)/            # Main route group with sidebar
│   │   ├── dashboard/
│   │   ├── monitor/
│   │   ├── mqtt/
│   │   ├── analytics/
│   │   └── settings/
│   └── page.tsx           # Root redirect to dashboard
│
├── components/            # React components
│   └── ui/               # UI components
│
├── server/                # Node.js API Backend
│   ├── src/
│   │   ├── config/       # Configuration (Redis, env)
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic (Cache, MQTT)
│   │   ├── types/        # TypeScript types
│   │   └── app.ts        # Main application
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── nginx/                 # Nginx configuration
│   ├── nginx.conf        # Main config
│   └── logs/             # Access & error logs
│
├── mosquitto/             # MQTT Broker
│   ├── config/           # Mosquitto config
│   ├── data/             # Persistent data
│   └── log/              # MQTT logs
│
├── docker-compose.yml     # Docker orchestration
├── Dockerfile.frontend    # Frontend container
├── .env.example          # Environment variables template
└── README_ARCHITECTURE.md # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd SomniAI_FE
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

5. **Start services with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - Nginx (port 80)
   - Next.js Frontend (port 3000)
   - Node.js Backend (port 4000)
   - Redis (port 6379)
   - Mosquitto MQTT (ports 1883, 9001)

### Development Mode (without Docker)

1. **Start Redis:**
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Start MQTT Broker:**
   ```bash
   docker run -d -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2
   ```

3. **Start Backend API:**
   ```bash
   cd server
   npm run dev
   ```

4. **Start Frontend:**
   ```bash
   npm run dev
   ```

## 🔌 API Endpoints

### Health & Status
- `GET /api/health` - Health check
- `GET /api/health/status` - System status

### Statistics
- `GET /api/stats` - Get system statistics (cached 30s)
- `POST /api/stats` - Update statistics
- `POST /api/stats/frames/increment` - Increment frame counter

### MQTT
- `POST /api/mqtt/publish` - Publish message
- `POST /api/mqtt/subscribe` - Subscribe to topic
- `POST /api/mqtt/unsubscribe` - Unsubscribe from topic
- `GET /api/mqtt/messages` - Get recent messages
- `GET /api/mqtt/status` - Connection status

## 🔧 Services

### 1. Nginx (Reverse Proxy)

**Features:**
- Reverse proxy for frontend and backend
- Load balancing
- Rate limiting (10 req/s for API, 30 req/s general)
- Gzip compression
- Static file caching
- Security headers

**Configuration:** `nginx/nginx.conf`

### 2. Node.js API Server

**Features:**
- Express.js framework
- TypeScript
- Redis integration for caching
- MQTT pub/sub functionality
- Rate limiting
- Error handling
- Request logging (Morgan)
- Security (Helmet)
- Compression

**Stack:**
- Express
- TypeScript
- Redis client
- MQTT.js
- Helmet (security)
- Morgan (logging)
- Compression

### 3. Redis

**Use Cases:**
- Response caching
- Session storage
- MQTT message queue
- Counter storage
- Temporary data

**Configuration:**
- Persistent storage with AOF
- Password protected (production)

### 4. Mosquitto MQTT

**Features:**
- MQTT protocol (port 1883)
- WebSocket support (port 9001)
- Message persistence
- Configurable logging

## 📊 Data Flow

### MQTT Message Flow:
```
1. MQTT Client publishes → Mosquitto Broker
2. Backend subscribes and receives message
3. Message stored in Redis queue
4. Frontend fetches via API
5. Display in dashboard
```

### API Request Flow:
```
1. Client → Nginx (port 80)
2. Nginx → Backend API (port 4000)
3. Backend checks Redis cache
4. If cached: return immediately
5. If not: process → cache → return
```

## 🔐 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - DDoS prevention
- **Nginx** - Request filtering
- **Redis** - Password protection (production)
- **Input Validation** - Request sanitization

## 📈 Performance Optimization

1. **Redis Caching:**
   - API responses cached for 30s
   - Reduces database/computation load
   - Fast response times

2. **Nginx Compression:**
   - Gzip enabled for text content
   - Reduces bandwidth usage

3. **Static File Caching:**
   - 1-year cache for assets
   - Reduces server load

4. **Connection Pooling:**
   - Keepalive connections
   - Reduced connection overhead

## 🧪 Testing

### Test Backend API:
```bash
# Health check
curl http://localhost/api/health

# Get stats
curl http://localhost/api/stats

# Publish MQTT message
curl -X POST http://localhost/api/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{"topic": "test/topic", "message": "Hello MQTT"}'
```

### Monitor Logs:
```bash
# Backend logs
docker logs -f somniai-backend

# Nginx logs
tail -f nginx/logs/access.log

# Redis logs
docker logs -f somniai-redis

# MQTT logs
tail -f mosquitto/log/mosquitto.log
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build

# Stop and remove volumes
docker-compose down -v
```

## 🛠️ Troubleshooting

### Redis Connection Issues:
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it somniai-redis redis-cli ping
```

### MQTT Connection Issues:
```bash
# Check Mosquitto is running
docker ps | grep mosquitto

# Test MQTT connection
docker exec -it somniai-mosquitto mosquitto_sub -t "test/#"
```

### Backend API Issues:
```bash
# Check backend logs
docker logs somniai-backend

# Restart backend
docker-compose restart backend
```

## 📝 Environment Variables

See `.env.example` for all available configuration options.

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Team

SomniAI Development Team
