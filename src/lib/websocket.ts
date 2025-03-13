import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export class WebSocketService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToAuction(auctionId: string, onUpdate: (payload: any) => void) {
    const channel = supabase.channel(`auction:${auctionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bids',
        filter: `auction_id=eq.${auctionId}`
      }, (payload) => onUpdate(payload))
      .subscribe();

    this.channels.set(auctionId, channel);
    return () => this.unsubscribeFromAuction(auctionId);
  }

  subscribeToAuctionStatus(auctionId: string, onStatusChange: (payload: any) => void) {
    const channelKey = `auction-status:${auctionId}`;
    const channel = supabase.channel(channelKey)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'auctions',
        filter: `id=eq.${auctionId}`
      }, (payload) => onStatusChange(payload))
      .subscribe();

    this.channels.set(channelKey, channel);
    return () => this.unsubscribeFromChannel(channelKey);
  }

  private unsubscribeFromAuction(auctionId: string) {
    this.unsubscribeFromChannel(`auction:${auctionId}`);
  }

  private unsubscribeFromChannel(channelKey: string) {
    const channel = this.channels.get(channelKey);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelKey);
    }
  }
}

export const websocketService = new WebSocketService();
