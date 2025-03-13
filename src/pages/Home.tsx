import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gavel, Shield, Clock, CreditCard, ArrowRight, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface FeaturedAuction {
  id: string;
  product: {
    title: string;
    images: string[];
  };
  start_price: number;
  end_time: string;
}

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredAuctions, setFeaturedAuctions] = useState<FeaturedAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedAuctions();
  }, []);

  async function fetchFeaturedAuctions() {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          start_price,
          end_time,
          product:product_id (
            title,
            images
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setFeaturedAuctions(data || []);
    } catch (err) {
      console.error('Error fetching featured auctions:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAuctionClick = (id: string) => {
    if (user) {
      navigate(`/auctions/${id}`);
    } else {
      navigate('/auth', { state: { from: `/auctions/${id}` } });
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90"></div>
        <div 
          className="relative h-[500px] flex items-center"
          style={{
            backgroundImage: 'url("https://files.oaiusercontent.com/file-4kj1b47hMkj4hWzL4UQdUo?se=2025-03-12T17%3A41%3A26Z&sp=r&sv=2024-08-04&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3D4e793a02-dad4-42cc-9074-0fa76281df3b.webp&sig=yXhGnmED0e8sKZbxbd%2B2Ei7IMWGb3LNfbrou5ksTIxU%3D")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="container mx-auto px-4">
            <div className="max-w-2xl text-white">
              <h1 className="text-5xl font-bold mb-6">
                Secure Sealed Bidding Platform
              </h1>
              <p className="text-xl mb-8">
                Join the most trusted auction platform with our unique sealed bidding system.
                Bid with confidence, win with transparency.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/auctions"
                  className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Browse Auctions
                </Link>
                {!user && (
                  <Link
                    to="/auth"
                    className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                  >
                    Sign Up Now
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Auctions */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Auctions</h2>
          <Link to={user ? "/auctions" : "/auth"} className="flex items-center text-indigo-600 hover:text-indigo-800">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : featuredAuctions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Gavel className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No active auctions at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredAuctions.map((auction) => (
              <div 
                key={auction.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                onClick={() => handleAuctionClick(auction.id)}
              >
                <div className="relative">
                  <img
                    src={auction.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                    alt={auction.product.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button className="bg-white text-indigo-600 px-4 py-2 rounded-full flex items-center">
                      <Eye className="h-4 w-4 mr-1" /> View Details
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2 line-clamp-1">{auction.product.title}</h3>
                  <p className="text-gray-600 mb-4">
                    Starting Bid: ${auction.start_price.toLocaleString()}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Ends {new Date(auction.end_time).toLocaleDateString()}
                    </span>
                    <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                      Sealed Bidding
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How Sealed Bidding Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-indigo-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Place Your Bid</h3>
              <p className="text-gray-600">
                Submit your maximum bid amount. Your bid remains confidential and hidden from other bidders.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-indigo-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Auction Closes</h3>
              <p className="text-gray-600">
                When the auction ends, all bids are revealed and the highest bidder wins the auction.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <span className="text-indigo-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Complete Purchase</h3>
              <p className="text-gray-600">
                If you win, you'll be notified immediately and can proceed with payment and shipping arrangements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose BidSmart?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Bidding</h3>
            <p className="text-gray-600">
              Your bids are encrypted and sealed until the auction ends
            </p>
          </div>
          <div className="text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gavel className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fair Process</h3>
            <p className="text-gray-600">
              Equal opportunity for all bidders with our sealed bid system
            </p>
          </div>
          <div className="text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
            <p className="text-gray-600">
              Instant notifications about your auctions and bids
            </p>
          </div>
          <div className="text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-600">
              Integrated payment system with buyer protection
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to Start Bidding?</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust our platform for secure and transparent auctions.
          </p>
          <Link
            to={user ? "/auctions" : "/auth"}
            className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-block"
          >
            {user ? "Browse Auctions" : "Create an Account"}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;