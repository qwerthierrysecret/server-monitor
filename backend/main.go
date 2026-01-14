package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/mattn/go-sqlite3"
)

// Configuration holds the agent configuration
type Configuration struct {
	Port     int
	Password string
	DBPath   string
}

// SystemMetrics holds all system metrics
type SystemMetrics struct {
	Timestamp int64       `json:"timestamp"`
	CPU       CPUMetrics  `json:"cpu"`
	Memory    MemMetrics  `json:"memory"`
	Disk      DiskMetrics `json:"disk"`
	Processes ProcMetrics `json:"processes"`
	System    SysMetrics  `json:"system"`
	Network   NetMetrics  `json:"network"`
}

// CPUMetrics holds CPU information
type CPUMetrics struct {
	UsagePercent float64 `json:"usage_percent"`
	LoadAvg1m    float64 `json:"load_avg_1m"`
	LoadAvg5m    float64 `json:"load_avg_5m"`
	LoadAvg15m   float64 `json:"load_avg_15m"`
	Cores        int     `json:"cores"`
}

// MemMetrics holds memory information
type MemMetrics struct {
	Total     uint64 `json:"total"`
	Used      uint64 `json:"used"`
	Free      uint64 `json:"free"`
	Available uint64 `json:"available"`
	Buffers   uint64 `json:"buffers"`
	Cached    uint64 `json:"cached"`
}

// DiskMetrics holds disk information
type DiskMetrics struct {
	Total      uint64            `json:"total"`
	Used       uint64            `json:"used"`
	Free       uint64            `json:"free"`
	Percent    float64           `json:"percent"`
	Mountpoint map[string]Mounts `json:"mountpoint"`
}

// Mounts holds mount point information
type Mounts struct {
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
	Percent float64 `json:"percent"`
}

// ProcMetrics holds process information
type ProcMetrics struct {
	Total   int `json:"total"`
	Running int `json:"running"`
}

// SysMetrics holds system information
type SysMetrics struct {
	Uptime       uint64 `json:"uptime"`
	Hostname     string `json:"hostname"`
	Kernel       string `json:"kernel"`
	Architecture string `json:"architecture"`
}

// NetMetrics holds network information
type NetMetrics struct {
	BytesSent     uint64 `json:"bytes_sent"`
	BytesReceived uint64 `json:"bytes_received"`
}

// Message represents a WebSocket message
type Message struct {
	Type   string          `json:"type"`
	Data   interface{}     `json:"data,omitempty"`
	Error  string          `json:"error,omitempty"`
	Status string          `json:"status,omitempty"`
}

// AuthMessage represents an authentication message
type AuthMessage struct {
	Type     string `json:"type"`
	Password string `json:"password"`
}

// HistoryRequest represents a request for historical data
type HistoryRequest struct {
	Type  string `json:"type"`
	Range string `json:"range"` // "1h", "6h", "12h", "24h", "2d", "7d"
}

// HistoryData represents historical metrics
type HistoryData struct {
	Timestamp int64   `json:"timestamp"`
	CPU       float64 `json:"cpu"`
	Memory    float64 `json:"memory"`
	Disk      float64 `json:"disk"`
}

// Client represents a connected WebSocket client
type Client struct {
	conn       *websocket.Conn
	send       chan Message
	mu         sync.Mutex
	Authorized bool
}

// Hub manages all connected clients
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	password   string
	db         *sql.DB
}

var (
	config Configuration
	hub    *Hub
	db     *sql.DB
)

func main() {
	flag.IntVar(&config.Port, "port", 8765, "WebSocket server port")
	flag.StringVar(&config.Password, "password", "admin123", "Authentication password")
	flag.StringVar(&config.DBPath, "db", "/var/lib/server-monitor/metrics.db", "SQLite database path")
	flag.Parse()

	// Ensure database directory exists
	lastSlash := strings.LastIndex(config.DBPath, "/")
	if lastSlash != -1 {
		dbDir := config.DBPath[:lastSlash]
		if err := os.MkdirAll(dbDir, 0755); err != nil {
			log.Printf("Warning: Could not create database directory: %v", err)
		}
	}

	// Initialize database
	var err error
	db, err = initDatabase(config.DBPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize hub
	hub = &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		password:   config.Password,
		db:         db,
	}

	// Start hub
	go hub.run()

	// Start metrics collector
	go collectMetrics()

	// Setup HTTP server
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/health", handleHealth)

	addr := fmt.Sprintf("0.0.0.0:%d", config.Port)
	log.Printf("Server Monitor Agent starting on %s", addr)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down gracefully...")
		db.Close()
		os.Exit(0)
	}()

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func initDatabase(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	// Create metrics table
	schema := `
	CREATE TABLE IF NOT EXISTS metrics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp INTEGER NOT NULL,
		cpu_percent REAL NOT NULL,
		memory_percent REAL NOT NULL,
		disk_percent REAL NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_timestamp ON metrics(timestamp);
	`

	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	return db, nil
}

func collectMetrics() {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		metrics := getSystemMetrics()
		msg := Message{
			Type: "metrics",
			Data: metrics,
		}

		// Store in database
		storeMetrics(db, metrics)

		// Broadcast to all clients
		hub.broadcast <- msg
	}
}

func getSystemMetrics() SystemMetrics {
	metrics := SystemMetrics{
		Timestamp: time.Now().Unix(),
		CPU:       getCPUMetrics(),
		Memory:    getMemoryMetrics(),
		Disk:      getDiskMetrics(),
		Processes: getProcessMetrics(),
		System:    getSystemInfo(),
		Network:   getNetworkMetrics(),
	}
	return metrics
}

var (
	lastCPUTime   float64
	lastTotalTime float64
	cpuMu         sync.Mutex
)

func getCPUMetrics() CPUMetrics {
	cpu := CPUMetrics{
		Cores: runtime.NumCPU(),
	}

	// Read /proc/stat for accurate CPU usage
	data, err := os.ReadFile("/proc/stat")
	if err == nil {
		lines := strings.Split(string(data), "\n")
		if len(lines) > 0 && strings.HasPrefix(lines[0], "cpu ") {
			fields := strings.Fields(lines[0])
			if len(fields) >= 5 {
				user, _ := strconv.ParseFloat(fields[1], 64)
				nice, _ := strconv.ParseFloat(fields[2], 64)
				system, _ := strconv.ParseFloat(fields[3], 64)
				idle, _ := strconv.ParseFloat(fields[4], 64)
				iowait, _ := strconv.ParseFloat(fields[5], 64)
				irq, _ := strconv.ParseFloat(fields[6], 64)
				softirq, _ := strconv.ParseFloat(fields[7], 64)

				totalCPUTime := user + nice + system + irq + softirq
				totalTime := totalCPUTime + idle + iowait

				cpuMu.Lock()
				if lastTotalTime > 0 {
					deltaTotal := totalTime - lastTotalTime
					deltaCPU := totalCPUTime - lastCPUTime
					if deltaTotal > 0 {
						cpu.UsagePercent = (deltaCPU / deltaTotal) * 100
					}
				}
				lastCPUTime = totalCPUTime
				lastTotalTime = totalTime
				cpuMu.Unlock()
			}
		}
	}

	// Read load average
	data, err = os.ReadFile("/proc/loadavg")
	if err == nil {
		parts := strings.Fields(string(data))
		if len(parts) >= 3 {
			cpu.LoadAvg1m, _ = strconv.ParseFloat(parts[0], 64)
			cpu.LoadAvg5m, _ = strconv.ParseFloat(parts[1], 64)
			cpu.LoadAvg15m, _ = strconv.ParseFloat(parts[2], 64)
		}
	}

	return cpu
}

func getMemoryMetrics() MemMetrics {
	mem := MemMetrics{}

	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return mem
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		value, _ := strconv.ParseUint(parts[1], 10, 64)
		value *= 1024 // Convert from KB to bytes

		switch parts[0] {
		case "MemTotal:":
			mem.Total = value
		case "MemFree:":
			mem.Free = value
		case "MemAvailable:":
			mem.Available = value
		case "Buffers:":
			mem.Buffers = value
		case "Cached:":
			mem.Cached = value
		}
	}

	if mem.Available > 0 {
		mem.Used = mem.Total - mem.Available
	} else {
		mem.Used = mem.Total - mem.Free - mem.Buffers - mem.Cached
	}

	return mem
}

func getDiskMetrics() DiskMetrics {
	disk := DiskMetrics{
		Mountpoint: make(map[string]Mounts),
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err == nil {
		disk.Total = stat.Blocks * uint64(stat.Bsize)
		disk.Free = stat.Bavail * uint64(stat.Bsize)
		disk.Used = disk.Total - disk.Free
		if disk.Total > 0 {
			disk.Percent = float64(disk.Used) / float64(disk.Total) * 100
		}

		disk.Mountpoint["/"] = Mounts{
			Total:   disk.Total,
			Used:    disk.Used,
			Free:    disk.Free,
			Percent: disk.Percent,
		}
	}

	return disk
}

func getProcessMetrics() ProcMetrics {
	proc := ProcMetrics{}

	entries, err := os.ReadDir("/proc")
	if err != nil {
		return proc
	}

	for _, entry := range entries {
		if entry.IsDir() && isNumeric(entry.Name()) {
			proc.Total++
		}
	}

	data, err := os.ReadFile("/proc/stat")
	if err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "procs_running") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					proc.Running, _ = strconv.Atoi(parts[1])
				}
			}
		}
	}

	return proc
}

func getSystemInfo() SysMetrics {
	sys := SysMetrics{
		Architecture: runtime.GOARCH,
	}

	hostname, err := os.Hostname()
	if err == nil {
		sys.Hostname = hostname
	}

	data, err := os.ReadFile("/proc/uptime")
	if err == nil {
		parts := strings.Fields(string(data))
		if len(parts) > 0 {
			uptime, _ := strconv.ParseFloat(parts[0], 64)
			sys.Uptime = uint64(uptime)
		}
	}

	data, err = os.ReadFile("/proc/version")
	if err == nil {
		parts := strings.Fields(string(data))
		if len(parts) > 2 {
			sys.Kernel = parts[2]
		}
	}

	return sys
}

func getNetworkMetrics() NetMetrics {
	net := NetMetrics{}

	data, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return net
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if strings.Contains(line, ":") && !strings.Contains(line, "face") {
			parts := strings.FieldsFunc(line, func(r rune) bool {
				return r == ':' || r == ' '
			})
			if len(parts) >= 10 {
				received, _ := strconv.ParseUint(parts[1], 10, 64)
				sent, _ := strconv.ParseUint(parts[9], 10, 64)
				net.BytesReceived += received
				net.BytesSent += sent
			}
		}
	}

	return net
}

func storeMetrics(db *sql.DB, metrics SystemMetrics) {
	query := `
	INSERT INTO metrics (timestamp, cpu_percent, memory_percent, disk_percent)
	VALUES (?, ?, ?, ?)
	`

	cpuPercent := metrics.CPU.UsagePercent
	memPercent := 0.0
	if metrics.Memory.Total > 0 {
		memPercent = float64(metrics.Memory.Used) / float64(metrics.Memory.Total) * 100
	}
	diskPercent := metrics.Disk.Percent

	if _, err := db.Exec(query, metrics.Timestamp, cpuPercent, memPercent, diskPercent); err != nil {
		log.Printf("Error storing metrics: %v", err)
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		conn:       conn,
		send:       make(chan Message, 256),
		Authorized: false,
	}

	hub.register <- client

	go handleClientAuth(client)
	go handleClientMessages(client)
}

func handleClientAuth(client *Client) {
	defer func() {
		if !client.Authorized {
			client.conn.Close()
			hub.unregister <- client
		}
	}()

	client.conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	var authMsg AuthMessage
	err := client.conn.ReadJSON(&authMsg)
	if err != nil {
		log.Printf("Auth read error: %v", err)
		return
	}

	if hashPassword(authMsg.Password) == hashPassword(hub.password) {
		client.Authorized = true
		client.conn.SetReadDeadline(time.Time{})

		client.send <- Message{
			Type:   "auth",
			Status: "success",
		}

		metrics := getSystemMetrics()
		client.send <- Message{
			Type: "metrics",
			Data: metrics,
		}
	} else {
		client.send <- Message{
			Type:  "auth",
			Error: "Invalid password",
		}
	}
}

func handleClientMessages(client *Client) {
	defer func() {
		hub.unregister <- client
		client.conn.Close()
	}()

	for {
		var rawMsg json.RawMessage
		err := client.conn.ReadJSON(&rawMsg)
		if err != nil {
			break
		}

		var baseMsg struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(rawMsg, &baseMsg); err != nil {
			continue
		}

		if baseMsg.Type == "history" && client.Authorized {
			var req HistoryRequest
			if err := json.Unmarshal(rawMsg, &req); err == nil {
				handleHistoryRequest(client, req)
			}
		}
	}
}

func handleHistoryRequest(client *Client, req HistoryRequest) {
	duration := 1 * time.Hour
	switch req.Range {
	case "1h":
		duration = 1 * time.Hour
	case "6h":
		duration = 6 * time.Hour
	case "12h":
		duration = 12 * time.Hour
	case "24h":
		duration = 24 * time.Hour
	case "2d":
		duration = 48 * time.Hour
	case "7d":
		duration = 168 * time.Hour
	}

	startTime := time.Now().Add(-duration).Unix()
	
	// Sample data to avoid sending too many points
	// For 1h (720 points), send all
	// For 7d (120,960 points), we need to aggregate
	
	var interval int
	switch req.Range {
	case "1h": interval = 1 // Every 5s
	case "6h": interval = 6 // Every 30s
	case "12h": interval = 12 // Every 1m
	case "24h": interval = 24 // Every 2m
	case "2d": interval = 48 // Every 4m
	case "7d": interval = 168 // Every 14m
	default: interval = 1
	}

	query := fmt.Sprintf(`
		SELECT timestamp, cpu_percent, memory_percent, disk_percent 
		FROM (
			SELECT *, ROW_NUMBER() OVER (ORDER BY timestamp) as row_num 
			FROM metrics 
			WHERE timestamp >= ?
		) 
		WHERE row_num %% %d = 0
		ORDER BY timestamp ASC
	`, interval)

	rows, err := hub.db.Query(query, startTime)
	if err != nil {
		log.Printf("History query error: %v", err)
		return
	}
	defer rows.Close()

	var history []HistoryData
	for rows.Next() {
		var d HistoryData
		if err := rows.Scan(&d.Timestamp, &d.CPU, &d.Memory, &d.Disk); err == nil {
			history = append(history, d)
		}
	}

	client.send <- Message{
		Type: "history",
		Data: map[string]interface{}{
			"range": req.Range,
			"points": history,
		},
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("Client unregistered. Total clients: %d", len(h.clients))

		case msg := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				if client.Authorized {
					select {
					case client.send <- msg:
					default:
						// Client's send channel is full, close it
						// We don't close here to avoid double close, unregister handles it
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return hex.EncodeToString(hash[:])
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func isNumeric(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}
