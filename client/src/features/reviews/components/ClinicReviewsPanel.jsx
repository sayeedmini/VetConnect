import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createClinicReview,
  getClinicReviews,
  getMyClinicReview,
  moderateReview,
  updateReview,
} from '../services/reviewApi';
import { useAuthSession } from '../../auth/context/AuthSessionContext';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
};

function ClinicReviewsPanel({ clinicId, clinicName = 'this clinic', onReviewStatsChange }) {
  const { user, isLoggedIn: loggedIn } = useAuthSession();
  const isAdmin = user?.role === 'admin';
  const canWriteReview = ['petOwner', 'admin'].includes(user?.role);

  const [reviews, setReviews] = useState([]);
  const [myReviewData, setMyReviewData] = useState({
    review: null,
    canReview: false,
    reason: '',
  });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ rating: 5, comment: '' });
  const [moderationDrafts, setModerationDrafts] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await getClinicReviews(clinicId, isAdmin);
      setReviews(response.data || []);
    } catch (error) {
      console.error(error);
    }
  }, [clinicId, isAdmin]);

  const fetchMyReview = useCallback(async () => {
    if (!loggedIn || !canWriteReview) {
      setMyReviewData({ review: null, canReview: false, reason: '' });
      return;
    }

    try {
      const response = await getMyClinicReview(clinicId);
      const payload = response.data || { review: null, canReview: false, reason: '' };
      setMyReviewData(payload);

      if (payload.review) {
        setFormData({
          rating: payload.review.rating,
          comment: payload.review.comment || '',
        });
      } else {
        setFormData({ rating: 5, comment: '' });
      }
    } catch (error) {
      console.error(error);
    }
  }, [canWriteReview, clinicId, loggedIn]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchReviews(), fetchMyReview()]);
      setLoading(false);
    };

    loadAll();
  }, [fetchMyReview, fetchReviews]);

  const approvedReviews = useMemo(
    () => reviews.filter((review) => review.moderationStatus === 'approved'),
    [reviews]
  );
  const canShowReviewComposer =
    canWriteReview && loggedIn && (Boolean(myReviewData.review) || Boolean(myReviewData.canReview));

  useEffect(() => {
    if (typeof onReviewStatsChange !== 'function') {
      return;
    }

    const totalReviews = approvedReviews.length;
    const rating = totalReviews
      ? Number(
          (
            approvedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
            totalReviews
          ).toFixed(1)
        )
      : 0;

    onReviewStatsChange({ rating, totalReviews });
  }, [approvedReviews, onReviewStatsChange]);

  const handleFormChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRatingChange = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating,
    }));
  };

  const handleReset = () => {
    if (myReviewData.review) {
      setFormData({
        rating: myReviewData.review.rating,
        comment: myReviewData.review.comment || '',
      });
      return;
    }

    setFormData({ rating: 5, comment: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (myReviewData.review?._id) {
        await updateReview(myReviewData.review._id, formData);
        alert('Review updated successfully');
      } else {
        await createClinicReview(clinicId, formData);
        alert('Review submitted successfully');
      }

      await Promise.all([fetchReviews(), fetchMyReview()]);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to save review');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getModerationDraft = (review) => {
    return (
      moderationDrafts[review._id] || {
        moderationStatus: review.moderationStatus,
        adminNote: review.adminNote || '',
      }
    );
  };

  const setModerationDraft = (reviewId, field, value) => {
    setModerationDrafts((prev) => ({
      ...prev,
      [reviewId]: {
        ...(prev[reviewId] || {}),
        [field]: value,
      },
    }));
  };

  const handleModerationSave = async (review) => {
    const payload = getModerationDraft(review);

    try {
      await moderateReview(review._id, payload);
      alert('Review moderation updated');
      await fetchReviews();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to moderate review');
      console.error(error);
    }
  };

  return (
    <section className="review-shell">
      <div className="review-shell-head">
        <div>
          <h2 className="review-shell-title">Clinic Reviews</h2>
          <p className="review-shell-subtitle">
            Verified pet owners can submit one review per clinic after a completed appointment.
          </p>
        </div>
        <div className="review-stat-pill">{approvedReviews.length} approved review(s)</div>
      </div>

      {loading ? (
        <div className="review-empty-card">Loading reviews...</div>
      ) : (
        <>
          {canShowReviewComposer && (
            <div className="review-compose-wrap">
              <div className="review-compose-header">
                <div className="review-backline">Share Your Experience</div>
                <h3 className="review-compose-title">
                  {myReviewData.review ? 'Update your clinic review' : 'Write a clinic review'}
                </h3>
                <p className="review-compose-copy">
                  Your review helps other pet parents find the best care.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="review-compose-card">
                <div className="review-visit-banner">
                  <span className="review-info-badge">i</span>
                  <p>
                    Review for your recent visit to <strong>{clinicName}</strong>
                    {user?.name ? (
                      <>
                        {' '}as <strong>{user.name}</strong>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="review-clinic-row">
                  <div>
                    <div className="review-field-label">Clinic</div>
                    <div className="review-clinic-name">{clinicName}</div>
                  </div>
                  <div className="review-verified-pill">Verified Visit</div>
                </div>

                {(myReviewData.review || myReviewData.canReview) && (
                  <>
                    <div className="review-section">
                      <div className="review-field-label">Overall Rating</div>
                      <div className="review-rating-row">
                        <div className="review-stars" role="radiogroup" aria-label="Overall rating">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={`review-star-button ${Number(formData.rating) >= value ? 'active' : ''}`}
                              onClick={() => handleRatingChange(value)}
                              aria-label={`${value} star${value > 1 ? 's' : ''}`}
                              aria-pressed={Number(formData.rating) >= value}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <span className="review-rating-label">
                          {RATING_LABELS[Number(formData.rating)] || 'Excellent'}
                        </span>
                      </div>
                    </div>

                    <div className="review-section">
                      <label className="review-field-label" htmlFor="review-comment">
                        Detailed Review
                      </label>
                      <textarea
                        id="review-comment"
                        name="comment"
                        rows="5"
                        maxLength="500"
                        className="review-textarea"
                        placeholder="Share details about the care your pet received, the staff professionalism, and the clinic environment..."
                        value={formData.comment}
                        onChange={handleFormChange}
                      />
                      <div className="review-char-count">{formData.comment.length} / 500 characters</div>
                    </div>

                    <div className="review-identity-grid">
                      <div className="review-readonly-field">
                        <label className="review-field-label" htmlFor="reviewer-name">
                          Your Name
                        </label>
                        <input id="reviewer-name" value={user?.name || 'Pet owner'} readOnly />
                      </div>

                      <div className="review-readonly-field">
                        <label className="review-field-label" htmlFor="clinic-name-readonly">
                          Clinic
                        </label>
                        <input id="clinic-name-readonly" value={clinicName} readOnly />
                      </div>
                    </div>

                    <div className="review-action-row">
                      <button type="button" className="review-cancel-button" onClick={handleReset}>
                        Cancel
                      </button>
                      <button type="submit" className="review-submit-button" disabled={submitting}>
                        {submitting
                          ? 'Saving review...'
                          : myReviewData.review
                            ? 'Update Review'
                            : 'Submit Review'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="review-empty-card">No reviews yet.</div>
          ) : (
            <div className="review-list-grid">
              {reviews.map((review) => {
                const draft = getModerationDraft(review);

                return (
                  <article key={review._id} className="review-card">
                    <div className="review-card-head">
                      <div>
                        <h4 className="review-card-name">{review.reviewer?.name || 'Anonymous user'}</h4>
                        <p className="review-card-meta">
                          {new Date(review.createdAt).toLocaleString()} · {review.rating}/5 rating
                        </p>
                      </div>
                      <span
                        className={`review-status-badge ${
                          review.moderationStatus === 'approved' ? 'approved' : 'rejected'
                        }`}
                      >
                        {review.moderationStatus}
                      </span>
                    </div>

                    <p className="review-card-copy">
                      {review.comment || 'No written comment provided.'}
                    </p>

                    {review.adminNote && (
                      <div className="review-admin-note">
                        <strong>Admin note:</strong> {review.adminNote}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="review-admin-panel">
                        <label className="review-admin-field">
                          <span className="review-field-label">Moderation Status</span>
                          <select
                            value={draft.moderationStatus}
                            onChange={(e) =>
                              setModerationDraft(review._id, 'moderationStatus', e.target.value)
                            }
                          >
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </label>

                        <label className="review-admin-field">
                          <span className="review-field-label">Admin Note</span>
                          <textarea
                            rows="3"
                            value={draft.adminNote}
                            onChange={(e) =>
                              setModerationDraft(review._id, 'adminNote', e.target.value)
                            }
                          />
                        </label>

                        <button type="button" className="review-admin-save" onClick={() => handleModerationSave(review)}>
                          Save Moderation
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ClinicReviewsPanel;
