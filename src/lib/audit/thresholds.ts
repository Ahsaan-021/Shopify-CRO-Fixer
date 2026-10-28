/**
 * Editorial CRO thresholds. These are practical guidance for reviewing a
 * product page, not proven conversion rules. They are kept in one place so the
 * static, product-JSON, and rendered audits agree with each other.
 */

export const CRO_THRESHOLDS = {
  /** Below this, product copy is usually too thin to answer buying questions. */
  descriptionMinChars: 400,
  /** Recommended number of distinct product images. */
  productImagesRecommended: 4,
  /** Apple and Google mobile guidance for a comfortable tap target. */
  tapTargetMinPx: 44,
  /** A fixed element covering more than this share of the screen is intrusive. */
  overlayMaxCoverage: 0.25,
  /** A stale or short description can still be valid; flag it clearly as editorial. */
  descriptionReviewedAsEditorial: true,
} as const;

export type CroThresholds = typeof CRO_THRESHOLDS;
