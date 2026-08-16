'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquarePlus, AlertCircle, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function ProductReviews({ productId, slug }: { productId?: string; slug: string }) {
  const [reviewsData, setReviewsData] = useState<{
    averageRating: number;
    totalReviews: number;
    distribution: Record<string, number>;
    reviews: any[];
  }>({
    averageRating: 5.0,
    totalReviews: 0,
    distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    reviews: [],
  });

  const [loading, setLoading] = useState(true);
  const [writeOpen, setWriteOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReviews = async () => {
    if (!slug) return;
    try {
      const res = await apiRequest(`/public/products/${slug}/reviews`);
      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setReviewsData({
            averageRating: res.data.length > 0 ? res.data.reduce((a: number, c: any) => a + c.rating, 0) / res.data.length : 5.0,
            totalReviews: res.data.length,
            distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            reviews: res.data,
          });
        } else {
          setReviewsData({
            averageRating: res.data.averageRating ?? 5.0,
            totalReviews: res.data.totalReviews ?? (res.data.reviews?.length || 0),
            distribution: res.data.distribution || { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            reviews: Array.isArray(res.data.reviews) ? res.data.reviews : [],
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await apiRequest('/customer/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          rating,
          title,
          comment,
        }),
      });

      if (res.success) {
        setSuccessMsg('Review submitted successfully! Thank you for your feedback.');
        setTimeout(() => {
          setWriteOpen(false);
          setSuccessMsg('');
          setTitle('');
          setComment('');
          fetchReviews();
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Failed to submit review. Only verified purchasers can post reviews.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review. Make sure you have purchased this product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (starCount: number, interactive = false) => {
    return (
      <div className="flex items-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            onMouseEnter={() => interactive && setHoverRating(s)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && setRating(s)}
            className={`w-4 h-4 ${interactive ? 'cursor-pointer transition-transform hover:scale-125' : ''} ${
              s <= (hoverRating || starCount)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300 dark:text-slate-700'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Loading reviews...</div>;
  }

  const { averageRating, totalReviews, distribution, reviews } = reviewsData;

  return (
    <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Customer Reviews & Ratings</h3>
          <div className="flex items-center gap-2 mt-1">
            {renderStars(Math.round(averageRating))}
            <span className="text-sm font-semibold text-foreground">{Number(averageRating).toFixed(1)} / 5</span>
            <span className="text-xs text-muted-foreground">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
          </div>
        </div>

        <Button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setWriteOpen(true);
          }}
          size="sm"
          className="gap-2 shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Write a Review
        </Button>
      </div>

      {/* Star Distribution Summary Bar if there are reviews */}
      {totalReviews > 0 && distribution && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-4 bg-secondary/20 rounded-xl border border-border/50 text-xs">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star.toString()] || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-6 font-medium text-foreground text-right">{star}★</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {(!reviews || reviews.length === 0) ? (
        <div className="p-8 rounded-xl bg-secondary/30 text-center">
          <p className="text-sm text-muted-foreground">No customer reviews yet. Be the first verified buyer to leave feedback!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review: any) => (
            <div key={review._id} className="border-b border-border last:border-0 pb-6 last:pb-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{review.customerName}</span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(review.rating)}
                    <span className="text-sm font-semibold text-foreground">{review.title}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{review.comment}</p>
              
              {review.adminReply && (
                <div className="mt-4 bg-secondary/50 p-4 rounded-xl border border-border">
                  <p className="text-xs font-semibold text-primary mb-1">Author Response:</p>
                  <p className="text-sm text-muted-foreground">{review.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Write Review Dialog */}
      {writeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setWriteOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground mb-1">Write a Product Review</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Share your experience with other developers. Only verified purchasers can publish reviews.
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Overall Rating
                </label>
                <div className="flex items-center gap-2">
                  {renderStars(rating, true)}
                  <span className="text-xs text-muted-foreground font-medium ml-2">({rating} of 5 stars)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Headline / Title
                </label>
                <input
                  placeholder="e.g. Excellent licensing toolkit & fast integration"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Detailed Review
                </label>
                <textarea
                  placeholder="What did you like or dislike? How was the setup and documentation?"
                  rows={4}
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setWriteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !title || !comment}>
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
