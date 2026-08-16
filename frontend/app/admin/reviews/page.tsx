'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Clock,
  MoreVertical,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [activeReview, setActiveReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let url = '/admin/reviews?limit=50';
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      const res = await apiRequest(url);
      if (res.success) {
        setReviews(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await apiRequest(`/admin/reviews/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        fetchReviews();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReview || !replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest(`/admin/reviews/${activeReview._id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: replyText }),
      });
      if (res.success) {
        setReplyDialogOpen(false);
        setReplyText('');
        setActiveReview(null);
        fetchReviews();
      }
    } catch (err) {
      console.error('Failed to submit reply', err);
    } finally {
      setIsSubmitting(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Reviews</h1>
          <p className="text-muted-foreground text-sm">Moderate feedback and verified purchase ratings</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchReviews()}
            className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-secondary/50 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No reviews found matching criteria.</div>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((review) => (
              <div key={review._id} className="p-6 hover:bg-secondary/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderStars(review.rating)}
                      <h3 className="font-semibold text-foreground text-sm">{review.title}</h3>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" /> Verified
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        review.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                        review.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}>
                        {review.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span>By <strong className="text-foreground">{review.customerName}</strong></span>
                      <span>Product: <strong className="text-foreground">{review.productId?.name || 'Unknown'}</strong></span>
                      {review.productVersion && <span>Version: {review.productVersion}</span>}
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>

                    {review.adminReply && (
                      <div className="mt-3 bg-secondary/50 p-3 rounded-xl text-sm border-l-4 border-primary">
                        <div className="font-semibold text-primary mb-1 flex items-center gap-2 text-xs">
                          <MessageSquare className="w-3 h-3" /> LicenseNest Support
                        </div>
                        <p className="text-foreground text-xs leading-relaxed">{review.adminReply}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {review.status !== 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(review._id, 'approved')}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    {review.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(review._id, 'rejected')}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveReview(review);
                        setReplyText(review.adminReply || '');
                        setReplyDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> Reply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setReplyDialogOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-foreground mb-1">Reply to Customer Review</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Your reply will be published directly under the customer's review on the store page.
            </p>

            {activeReview && (
              <div className="bg-secondary/40 p-3 rounded-xl text-xs italic text-muted-foreground mb-4 border border-border">
                "{activeReview.comment}"
              </div>
            )}

            <form onSubmit={handleReplySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Official Response
                </label>
                <textarea
                  placeholder="Thank you for your feedback! Here is our response..."
                  className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setReplyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !replyText.trim()}>
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
