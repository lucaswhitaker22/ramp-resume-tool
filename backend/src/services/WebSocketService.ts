import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createError } from '@/middleware/errorHandler';

export interface ProgressUpdate {
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep?: string;
  estimatedCompletionTime?: Date;
  error?: string;
  data?: any;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, string[]> = new Map(); // analysisId -> socketIds

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Handle analysis subscription
      socket.on('subscribe-analysis', (analysisId: string) => {
        if (!analysisId || typeof analysisId !== 'string') {
          socket.emit('error', { message: 'Invalid analysis ID' });
          return;
        }

        // Add socket to analysis subscribers
        if (!this.connectedClients.has(analysisId)) {
          this.connectedClients.set(analysisId, []);
        }
        this.connectedClients.get(analysisId)!.push(socket.id);

        // Join socket to analysis room
        socket.join(`analysis-${analysisId}`);
        
        console.log(`Client ${socket.id} subscribed to analysis ${analysisId}`);
        
        // Send confirmation
        socket.emit('subscribed', { analysisId });
      });

      // Handle analysis unsubscription
      socket.on('unsubscribe-analysis', (analysisId: string) => {
        if (!analysisId || typeof analysisId !== 'string') {
          return;
        }

        // Remove socket from analysis subscribers
        const subscribers = this.connectedClients.get(analysisId);
        if (subscribers) {
          const index = subscribers.indexOf(socket.id);
          if (index > -1) {
            subscribers.splice(index, 1);
            if (subscribers.length === 0) {
              this.connectedClients.delete(analysisId);
            }
          }
        }

        // Leave socket from analysis room
        socket.leave(`analysis-${analysisId}`);
        
        console.log(`Client ${socket.id} unsubscribed from analysis ${analysisId}`);
        
        // Send confirmation
        socket.emit('unsubscribed', { analysisId });
      });

      // Handle ping for connection health check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
        
        // Clean up subscriptions
        this.connectedClients.forEach((subscribers, analysisId) => {
          const index = subscribers.indexOf(socket.id);
          if (index > -1) {
            subscribers.splice(index, 1);
            if (subscribers.length === 0) {
              this.connectedClients.delete(analysisId);
            }
          }
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for client ${socket.id}:`, error);
      });
    });

    // Handle server-level errors
    this.io.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  /**
   * Send progress update to all subscribers of an analysis
   */
  public sendProgressUpdate(update: ProgressUpdate): void {
    const room = `analysis-${update.analysisId}`;
    
    // Emit to all clients in the analysis room
    this.io.to(room).emit('progress-update', {
      ...update,
      timestamp: new Date().toISOString(),
    });

    console.log(`Progress update sent for analysis ${update.analysisId}: ${update.status} (${update.progress}%)`);
  }

  /**
   * Send error notification to analysis subscribers
   */
  public sendError(analysisId: string, error: string): void {
    const room = `analysis-${analysisId}`;
    
    this.io.to(room).emit('analysis-error', {
      analysisId,
      error,
      timestamp: new Date().toISOString(),
    });

    console.log(`Error notification sent for analysis ${analysisId}: ${error}`);
  }

  /**
   * Send completion notification to analysis subscribers
   */
  public sendCompletion(analysisId: string, data: any): void {
    const room = `analysis-${analysisId}`;
    
    this.io.to(room).emit('analysis-complete', {
      analysisId,
      data,
      timestamp: new Date().toISOString(),
    });

    console.log(`Completion notification sent for analysis ${analysisId}`);
  }

  /**
   * Get number of subscribers for an analysis
   */
  public getSubscriberCount(analysisId: string): number {
    return this.connectedClients.get(analysisId)?.length || 0;
  }

  /**
   * Get total number of connected clients
   */
  public getTotalConnections(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    activeAnalyses: number;
    subscriptionsByAnalysis: Record<string, number>;
  } {
    const subscriptionsByAnalysis: Record<string, number> = {};
    
    this.connectedClients.forEach((subscribers, analysisId) => {
      subscriptionsByAnalysis[analysisId] = subscribers.length;
    });

    return {
      totalConnections: this.getTotalConnections(),
      activeAnalyses: this.connectedClients.size,
      subscriptionsByAnalysis,
    };
  }

  /**
   * Broadcast system message to all connected clients
   */
  public broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system-message', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });

    console.log(`System message broadcasted: ${message} (${type})`);
  }

  /**
   * Close WebSocket server
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}

// Singleton instance
let webSocketService: WebSocketService | null = null;

export const initializeWebSocketService = (server: HttpServer): WebSocketService => {
  if (webSocketService) {
    throw new Error('WebSocket service already initialized');
  }
  
  webSocketService = new WebSocketService(server);
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized');
  }
  
  return webSocketService;
};