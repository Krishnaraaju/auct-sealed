import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useInView } from 'react-intersection-observer';

interface Auction {
  id: string;
  product: {
    id: string;
    title: string;
    description: string;
    images: string[];
  };
  start_price: number;
  end_time: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
}

function Auctions() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [sortBy, setSortBy] = useState<'end_time' | 'start_price'>('end_time');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { ref, inView } = useInView();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);

  // Handle the immediate search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Update search behavior
  useEffect(() => {
    if (!auctions) return;
    // Filter locally first for immediate feedback
    const filtered = auctions.filter(auction => 
      auction.product?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAuctions(filtered);
  }, [searchTerm, auctions]);

  // Debounced API call
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 3 || searchTerm.trim().length === 0) {
        setPage(1);
        fetchAuctions();
      }
    }, 500); // Increased debounce time to 500ms

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (inView && hasMore) {
      loadMoreAuctions();
    }
  }, [inView]);

  async function fetchAuctions() {
    try {
      setLoading(true);
      let query = supabase
        .from('auctions')
        .select(`
          id,
          start_price,
          end_time,
          status,
          product:product_id (
            id,
            title,
            description,
            images
          )
        `)
        .eq('status', 'active')
        .gte('start_price', priceRange[0])
        .lte('start_price', priceRange[1]);

      // Apply search filter if search term exists
      if (searchTerm.trim().length >= 3) {
        query = query.ilike('product.title', `%${searchTerm}%`);
      }

      query = query.order(sortBy, { ascending: sortBy === 'start_price' });

      const { data, error } = await query;
      if (error) throw error;

      const validAuctions = (data || []).filter(
        auction => auction.product && auction.product.images && auction.product.images.length > 0
      );

      setAuctions(validAuctions);
      setFilteredAuctions(validAuctions);
      setHasMore(validAuctions.length >= 12);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreAuctions() {
    if (!hasMore || loading) return;

    const from = page * 12;
    const to = from + 11;

    try {
      let query = supabase
        .from('auctions')
        .select(`
          id,
          start_price,
          end_time,
          status,
          product:product_id (
            id,
            title,
            description,
            images
          )
        `)
        .eq('status', 'active')
        .gte('start_price', priceRange[0])
        .lte('start_price', priceRange[1])
        .range(from, to);

      if (searchTerm.trim()) {
        query = query.ilike('product.title', `%${searchTerm}%`);
      }

      query = query.order(sortBy, { ascending: sortBy === 'start_price' });

      const { data, error } = await query;
      if (error) throw error;

      const validAuctions = (data || []).filter(
        auction => auction.product && auction.product.images && auction.product.images.length > 0
      );

      if (validAuctions.length < 12) {
        setHasMore(false);
      }
      
      setAuctions(prev => [...prev, ...validAuctions]);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch more auctions');
    }
  }

  const FilterBar = () => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Auctions
          </label>
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
          />
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-sm text-gray-500 mt-1">
              Enter at least 3 characters for search
            </p>
          )}
        </div>
        <div>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'end_time' | 'start_price')}
            className="w-full p-2 border rounded"
          >
            <option value="end_time">Sort by End Time</option>
            <option value="start_price">Sort by Price</option>
          </select>
        </div>
        <div>
          <input
            type="range"
            min="0"
            max="1000000"
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full"
          />
          <div className="text-sm text-gray-600">
            Price Range: ${priceRange[0]} - ${priceRange[1]}
          </div>
        </div>
      </div>
    </div>
  );

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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Active Auctions</h1>
      <FilterBar />
      {filteredAuctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No active auctions at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => (
            <div key={auction.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={auction.product?.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                alt={auction.product?.title || "Auction item"}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{auction.product?.title || "Untitled Item"}</h2>
                <p className="text-gray-600 mb-4">
                  Starting Bid: ${auction.start_price?.toLocaleString() || "0"}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Ends {formatDistanceToNow(new Date(auction.end_time), { addSuffix: true })}
                  </span>
                  <Link
                    to={`/auctions/${auction.id}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={ref} className="col-span-full flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Auctions;