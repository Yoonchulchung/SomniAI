# SomniAI Frontend

Web-based monitoring and MQTT control system for SomniAI project.

## Features

- **Webcam Streaming**: Real-time webcam monitoring with server transmission
- **MQTT Control**: Full MQTT pub/sub functionality with WebSocket support
- **Dashboard**: System overview and real-time statistics
- **Analytics**: Data visualization and performance metrics
- **Settings**: Configurable server and MQTT settings

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **MQTT**: mqtt.js (WebSocket-based)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MQTT broker with WebSocket support (port 9001)
- Backend server for frame reception

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
SomniAI_FE/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard page
│   ├── monitor/           # Webcam monitoring page
│   ├── mqtt/              # MQTT control page
│   ├── analytics/         # Analytics page
│   ├── settings/          # Settings page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # UI components (Card, Button, Badge)
│   └── webcam/           # Webcam-related components
├── hooks/                # Custom React hooks
│   ├── useWebcam.ts     # Webcam management hook
│   └── useMQTT.ts       # MQTT operations hook
├── lib/                  # Utility libraries
│   └── mqtt.ts          # MQTT service layer
└── public/              # Static assets
```

## Pages

### Home (`/`)
- Landing page with navigation to all features
- Quick access menu with icons
- System status overview

### Monitor (`/monitor`)
- Real-time webcam streaming
- Frame capture functionality
- Server transmission with configurable FPS
- Device selection
- Statistics display

### MQTT (`/mqtt`)
- Connection management (WebSocket)
- Message publishing with QoS and retained flag
- Topic subscription with wildcard support (`#`, `+`)
- Real-time message history
- Active subscriptions management

### Dashboard (`/dashboard`)
- System status overview
- Active streams counter
- MQTT message statistics
- Recent activity log
- Connected devices

### Analytics (`/analytics`)
- Frame transmission statistics
- MQTT traffic visualization
- Response time metrics
- System performance monitoring

### Settings (`/settings`)
- Server URL configuration
- MQTT broker settings
- Video FPS settings
- Auto-reconnect toggle
- App information

## MQTT Configuration

The app uses WebSocket-based MQTT (ws:// or wss://):
- Default port: 9001
- Protocol: WebSocket (ws)
- Supported QoS: 0, 1, 2
- Wildcard support: Yes

### Example MQTT Broker Setup

For testing, you can use Mosquitto with WebSocket support:

```bash
# mosquitto.conf
listener 1883
listener 9001
protocol websockets
allow_anonymous true
```

## API Endpoints

### Frame Upload
```
POST /upload
Content-Type: application/json

{
  "frame": "data:image/jpeg;base64,...",
  "timestamp": 1699999999999
}
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_DEFAULT_SERVER_URL=http://192.168.0.100:8000
NEXT_PUBLIC_DEFAULT_MQTT_HOST=localhost
NEXT_PUBLIC_DEFAULT_MQTT_PORT=9001
```

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: WebRTC may require HTTPS

## License

ISC

## Team

SomniAI Team - 2025
