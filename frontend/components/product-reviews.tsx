'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquarePlus, AlertCircle, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function ProductReviews({ productId, slug }: { productId?: string; slug: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
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
      if (res.success) {
        setReviews(res.data || []);
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

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length
      : 5.0;

  return (
    <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Customer Reviews & Ratings</h3>
          <div className="flex items-center gap-2 mt-1">
            {renderStars(Math.round(avgRating))}
            <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)} / 5</span>
            <span className="text-xs text-muted-foreground">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
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

      {reviews.length === 0 ? (
        <div className="p-8 rounded-xl bg-secondary/30 text-center">
          <p className="text-sm text-muted-foreground">No customer reviews yet. Be the first verified buyer to leave feedback!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
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
