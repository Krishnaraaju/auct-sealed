import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { websocketService } from '../lib/websocket';
import { ImageCarousel } from '../components/ui/ImageCarousel';
import { NotificationService } from '../services/NotificationService';

interface Auction {
  id: string;
  product: {
    id: string;
    title: string;
    description: string;
    images: string[];
    seller_id: string;
  };
  start_price: number;
  end_time: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  highest_bid?: number;
  sealed_bidding?: boolean;
}

function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchAuctionDetails();
      
      // Subscribe to bid updates
      const unsubscribeBids = websocketService.subscribeToAuction(id, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Update highest bid
          setAuction(prev => prev ? {
            ...prev,
            highest_bid: Math.max(payload.new.amount, prev.highest_bid || 0)
          } : null);
        }
      });
      
      // Subscribe to auction status changes
      const unsubscribeStatus = websocketService.subscribeToAuctionStatus(id, (payload) => {
        if (payload.eventType === 'UPDATE' && 
            payload.old.status === 'active' && 
            payload.new.status === 'ended') {
          
          // Update auction status
          setAuction(prev => prev ? {
            ...prev,
            status: 'ended'
          } : null);
          
          // Show notification for sealed bidding auction end
          if (payload.new.sealed_bidding && user) {
            NotificationService.showNotification(
              'Sealed Bidding Auction Ended',
              {
                body: `The sealed bidding auction for ${auction?.product.title} has ended. Check your notifications for results.`,
                icon: auction?.product.images[0]
              }
            );
          }
        }
      });
      
      return () => {
        unsubscribeBids();
        unsubscribeStatus();
      };
    }
  }, [id, user, auction?.product.title, auction?.product.images]);

  async function fetchAuctionDetails() {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          start_price,
          end_time,
          status,
          sealed_bidding,
          product:product_id (
            id,
            title,
            description,
            images,
            seller_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Get the highest bid
      const { data: bids } = await supabase
        .from('bids')
        .select('amount')
        .eq('auction_id', id)
        .order('amount', { ascending: false })
        .limit(1);

      // Ensure product is properly formatted as an object, not an array
      const formattedData = {
        ...data,
        product: Array.isArray(data.product) ? data.product[0] : data.product,
        highest_bid: bids && bids[0] ? bids[0].amount : data.start_price
      };
      
      setAuction(formattedData);
      setBidAmount(bids && bids[0] ? bids[0].amount + 1 : data.start_price);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auction details');
    } finally {
      setLoading(false);
    }
  }

  async function handleBidSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to place a bid');
      return;
    }

    if (!auction || bidAmount <= (auction.highest_bid || auction.start_price)) {
      setError('Bid amount must be higher than the current highest bid');
      return;
    }

    try {
      const { error } = await supabase
        .from('bids')
        .insert([
          {
            auction_id: id,
            bidder_id: user.id,
            amount: bidAmount
          }
        ]);

      if (error) throw error;
      
      await NotificationService.showNotification(
        'Bid Placed Successfully',
        {
          body: `Your bid of $${bidAmount} has been placed`,
          icon: auction.product.images[0]
        }
      );
      
      // Refresh auction details to show new highest bid
      await fetchAuctionDetails();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Auction not found</p>
      </div>
    );
  }

  const isEnded = new Date(auction.end_time) < new Date();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          <div>
            <ImageCarousel 
              images={auction.product.images} 
              alt={auction.product.title} 
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-4">{auction.product.title}</h1>
            <p className="text-gray-600 mb-6">
              {auction.product.description}
            </p>
            
            <div className="space-y-4 mb-8">
              <div>
                <h3 className="text-lg font-semibold">Base Price</h3>
                <p className="text-2xl font-bold text-indigo-600">
                  ${(auction.start_price).toLocaleString()}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">
                  {isEnded ? 'Auction Ended' : 'Time Remaining'}
                </h3>
                <p className="text-xl">
                  {isEnded 
                    ? 'This auction has ended'
                    : formatDistanceToNow(new Date(auction.end_time), { addSuffix: true })}
                </p>
              </div>
            </div>

            {!isEnded && (
              <form onSubmit={handleBidSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Bid Amount
                  </label>
                  <input
                    type="number"
                    min={auction.highest_bid ? auction.highest_bid + 1 : auction.start_price}
                    step="1"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Enter bid amount"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition-colors"
                  disabled={!user}
                >
                  {user ? 'Place Bid' : 'Sign in to Place Bid'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionDetail;
