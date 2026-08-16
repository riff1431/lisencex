'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';
import { ProductImage } from '@/components/product-image';

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/customer/reviews');
      if (res.success) {
        setReviews(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 ${s <= rating ? 'fill-current' : 'text-slate-300 dark:text-slate-700'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Reviews</h1>
        <p className="text-slate-500">Your feedback on purchased products</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No reviews yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              You haven't submitted any reviews for your purchases. Visit a product page to leave feedback.
            </p>
            <Link href="/store">
              <Button>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {reviews.map((review) => (
              <div key={review._id} className="p-6">
                <div className="flex gap-4">
                  {review.productId && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                      <ProductImage
                        src={review.productId.iconUrl || review.productId.thumbnailUrl}
                        alt={review.productId.name}
                        variant="icon"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {review.productId ? (
                          <Link href={`/store/${review.productId.slug}`} className="hover:underline">
                            {review.productId.name}
                          </Link>
                        ) : (
                          'Unknown Product'
                        )}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        review.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        review.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {review.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {review.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {review.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium">{review.title}</span>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">"{review.comment}"</p>

                    <div className="text-xs text-slate-500 pt-1">
                      Submitted on {new Date(review.createdAt).toLocaleDateString()}
                    </div>

                    {review.adminReply && (
                      <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm border border-indigo-100 dark:border-indigo-900">
                        <div className="font-semibold text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Response from Author
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{review.adminReply}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
