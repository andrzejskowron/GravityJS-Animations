/**
 * Deformation – Position-aware material deformation math for GravityJS.
 *
 * Given a click/touch position relative to an element's bounding rect, this
 * module computes physically-motivated per-axis scale and translation targets
 * that make the element appear to deform toward the pressed point.
 *
 * Deformation zones (determined by click position):
 *   - Center  (|cx| < threshold AND |cy| < threshold): uniform inward compression
 *            → symmetrical squeeze, no translation
 *   - Edge-X  (|cx| ≥ threshold AND |cy| < threshold): directional horizontal
 *            compression with slight vertical preservation
 *            → compressed left/right, minimal top/bottom deformation
 *   - Edge-Y  (|cx| < threshold AND |cy| ≥ threshold): directional vertical
 *            compression with slight horizontal preservation
 *            → compressed top/down, minimal left/right deformation
 *   - Corner  (|cx| ≥ threshold AND |cy| ≥ threshold): diagonal compression +
 *            translation toward the pressed corner
 *            → both axes compress, element pushes toward click point
 *
 * Click position coordinate system:
 *   cx, cy ∈ [-1, 1] where (0,0) = center of element
 *          (-1,-1) = top-left corner, (1,1) = bottom-right corner
 *   |cx| ≈ distance from vertical centerline (normalized to [-1,1])
 *   |cy| ≈ distance from horizontal midline (normalized to [-1,1])
 *
 * The equations use configurable knobs:
 *   strength  – overall deformation intensity multiplier    (default: 1.0)
 *   depth     – base scale reduction at center press        (default: 0.06)
 *   cornerBoost – extra compression when clicking corners   (default: 0.5)
 *   edgeBias  – preserves opposite axis more on edge clicks (default: 0.3)
 *
 * Axis-bias formula for scale reduction:
 *   baseScale = 1 − depth × strength
 *   scaleX    = baseScale − depth × strength × edgeX × EDGE_AMP
 *   scaleY    = baseScale − depth × strength × edgeY × EDGE_AMP
 *
 * Translation toward press point (only active on edges/corners):
 *   translateX = cx × |cx| × maxTranslate × translationWeight
 *   translateY = cy × |cy| × maxTranslate × translationWeight
 *   where maxTranslate = 4 × strength, translationWeight increases with edge proximity
 */

export type DeformationZone = 'center' | 'edge-x' | 'edge-y' | 'corner';
export type DeformationMode = 'collapse' | 'spread';

export interface DeformationOptions {
  cornerBoost?: number;
  edgeBias?: number;
  mode?: DeformationMode;
  curvature?: number;
}

/** Physical contact/load parameters for elastic outline deformation. */
export interface ContourDeformationProfile {
  /** Pointer position normalized to the element box: [0,1] × [0,1]. */
  contactX: number;
  contactY: number;
  /** Applied transverse contact force magnitude in newtons. */
  force: number;
  /** Effective radius of the contact patch in CSS pixels. */
  contactRadius: number;
}

/** Deformation targets to be fed to the spring animator. */
export interface DeformationResult {
  /** Target scaleX — less than 1 (element compressed horizontally). */
  scaleX: number;
  /** Target scaleY — less than 1 (element compressed vertically). */
  scaleY: number;
  /** Target horizontal translation toward the press point (px). */
  translateX: number;
  /** Target vertical translation toward the press point (px). */
  translateY: number;
  /** Contour response profile for real boundary deformation. */
  contour: ContourDeformationProfile;
  /** Deformation family used to compute the result. */
  mode: DeformationMode;
  /** Deformation zone classification — useful for debugging / callbacks. */
  zone: DeformationZone;
}

/**
 * Edge-proximity threshold [0,1].
 * Values above this classify the press as "edge" or "corner" along that axis.
 * Higher = more area classified as center, lower = more aggressive edge detection.
 */
export const EDGE_THRESHOLD = 0.4;

/**
 * Edge-axis amplification factor for deformation.
 * When pressing near an edge, that axis compresses (1 + EDGE_AMP)× more than center.
 * Value of 2.5 means edge-axis gets up to 250% additional compression vs center -
 * making edge deformations clearly distinct from uniform center presses.
 */
export const EDGE_AMP = 2.5;

/**
 * Corner boost factor for additional deformation when pressing near corners.
 * Adds extra compression beyond the sum of both axes' contributions.
 * Higher values create dramatic corner squishing effect.
 */
export const CORNER_BOOST = 1.5;

/**
 * Edge preservation bias for the non-deforming axis on edge clicks.
 * When pressing on an edge, the orthogonal axis preserves its scale better.
 * Lower values allow more contrast between deformed and preserved axes.
 */
export const EDGE_BIAS = 0.2;

/**
 * Translation weight multiplier for edge/corner presses.
 * Controls how far the element translates toward the click point.
 * At center (edgeX=0 or edgeY=0), translation is zero regardless of this value.
 * Higher values create more dramatic corner push effects.
 */
const TRANSLATION_WEIGHT_BASE = 6;

/**
 * Base scale reduction depth for deformation.
 * Default 0.12 gives visible center compression vs edges/corners.
 */
export const DEFAULT_DEPTH = 0.06;

/**
 * Compute deformation targets from a pointer position with detailed zone detection.
 *
 * Click position interpretation:
 *   - Center click: element compresses uniformly like pressing a balloon center
 *   - Edge click: element compresses directionally, preserving the opposite axis
 *   - Corner click: element deforms diagonally and translates toward corner
 *
 * @param rect      - Element's current bounding client rect.
 * @param clientX   - Pointer X in viewport coordinates (page/client space).
 * @param clientY   - Pointer Y in viewport coordinates (page/client space).
 * @param strength  - Overall intensity multiplier, ≥0 (default: 1.5 recommended for visible effects).
 *                    Higher values = more extreme deformation and translation. Use 1.2+ for noticeable differences.
 * @param depth     - Base scale reduction at center press, typically 0.08–0.15
 *                    (default: 0.12). Larger = deeper uniform compression. Values < 0.1 may be too subtle.
 * @param options   - Optional override for CORNER_BOOST and EDGE_BIAS presets.
 * @returns         DeformationResult with per-axis scale/translate targets + zone.
 */
export function computeDeformation(
  rect: DOMRect,
  clientX: number,
  clientY: number,
  strength: number = 1.0,
  depth: number = DEFAULT_DEPTH,
  options?: DeformationOptions,
): DeformationResult {
  // Guard against zero-size elements to prevent NaN/division issues.
  const w = rect.width  || 1;
  const h = rect.height || 1;

  // Clamp pointer position to element bounds (handles clicks just outside edges).
  const nx = Math.max(0, Math.min(1, (clientX - rect.left) / w));
  const ny = Math.max(0, Math.min(1, (clientY - rect.top)  / h));

  // Centred position in [−1, 1]: 0 = centre, ±1 = edge/corner.
  // cx > 0 → right half, cx < 0 → left half; same for cy (top/bottom).
  const cx = (nx - 0.5) * 2;
  const cy = (ny - 0.5) * 2;

  // Edge proximity magnitude [0, 1]: 0 at centre, 1 at the element boundary/corner.
  const edgeX = Math.abs(cx);
  const edgeY = Math.abs(cy);

  // Clamp strength and depth to non-negative values for stability.
  const s = Math.max(0, strength);
  const d = Math.max(0, depth);

  // Corner boost factor (optional override).
  const cornerBoost = options?.cornerBoost ?? CORNER_BOOST;
  // Edge bias preserves the non-deforming axis more on edge clicks.
  const edgeBias    = options?.edgeBias    ?? EDGE_BIAS;
  const mode: DeformationMode = options?.mode === 'spread' ? 'spread' : 'collapse';
  const curvature = Math.max(0, options?.curvature ?? 1);

  // Compute base scale reduction from center press contribution.
  // Both axes start with this base, then are modified by proximity factors.
  const baseScaleReduction = d * s;

  // Edge/corner scaling: each axis compresses significantly more the closer to its edge.
  // Formula: extraCompression = depth × strength × (edgeProximity × EDGE_AMP)
  // With EDGE_AMP=2.5, an edge press gets ~2.5× more compression on that axis vs center
  const scaleXExtra = baseScaleReduction * (edgeX * EDGE_AMP);
  const scaleYExtra = baseScaleReduction * (edgeY * EDGE_AMP);

  // Corner boost adds extra diagonal compression when both edges are near.
  // The boost scales with how close we are to the actual corner point.
  const cornerFactor = Math.min(edgeX, edgeY); // how close to corner vs just either edge
  const cornerBoostAmount = baseScaleReduction * cornerBoost * cornerFactor;
  const isEdgeXFlag = isEdgeX(edgeX);
  const isEdgeYFlag = isEdgeY(edgeY);

  let zone: DeformationZone;
  if (isEdgeXFlag && isEdgeYFlag) {
    zone = 'corner';
  } else if (isEdgeXFlag) {
    zone = 'edge-x';
  } else if (isEdgeYFlag) {
    zone = 'edge-y';
  } else {
    zone = 'center';
  }

  // Apply edge bias: when one axis is near its edge, the orthogonal axis
  // preserves more of its original scale (less compression).
  const preservedX = !isEdgeXFlag && isEdgeYFlag;
  const preservedY = !isEdgeYFlag && isEdgeXFlag;

  let scaleX: number;
  let scaleY: number;

  if (mode === 'spread') {
    const baseExpansion = baseScaleReduction * 0.85;
    const spreadXExtra = baseScaleReduction * edgeX * 1.45;
    const spreadYExtra = baseScaleReduction * edgeY * 1.45;
    const cornerExpansion = baseScaleReduction * (cornerBoost * 0.8) * cornerFactor;

    scaleX = Math.min(1.75, 1 + baseExpansion + spreadXExtra + cornerExpansion);
    scaleY = Math.min(1.75, 1 + baseExpansion + spreadYExtra + cornerExpansion);

    if (preservedX) {
      scaleX = Math.min(1.3, 1 + baseExpansion * (0.55 + edgeBias));
    }
    if (preservedY) {
      scaleY = Math.min(1.3, 1 + baseExpansion * (0.55 + edgeBias));
    }
  } else {
    scaleX = Math.max(0.3, 1 - baseScaleReduction - scaleXExtra - cornerBoostAmount);
    scaleY = Math.max(0.3, 1 - baseScaleReduction - scaleYExtra - cornerBoostAmount);

    // Edge preservation: reduce compression on the non-active axis for edge clicks.
    if (preservedX) {
      scaleX = Math.max(0.65, 1 - baseScaleReduction * (1 - edgeBias));
    }
    if (preservedY) {
      scaleY = Math.max(0.65, 1 - baseScaleReduction * (1 - edgeBias));
    }
  }

  // Translation toward press point:
  // At center (edgeX=0 or edgeY=0), translation is zero — no push effect.
  // On edges/corners, element "pushes" toward the click with quadratic falloff.
  const maxTranslate = TRANSLATION_WEIGHT_BASE * s; // px base translation

  // Quadratic proximity factor: |p| × |p| weights stronger clicks more than light edge touches.
  const translateXFactor = cx * edgeX;
  const translateYFactor = cy * edgeY;

  let translateWeight = 1 + cornerFactor * 0.8; // corners push harder
  if (cornerFactor > EDGE_THRESHOLD) {
    translateWeight += 0.5; // extra push for true corners
  }

  const translateDirection = mode === 'spread' ? -1 : 1;
  const translateDamping = mode === 'spread' ? 0.65 : 1;
  const translateX = translateDirection * translateXFactor * maxTranslate * translateWeight * translateDamping;
  const translateY = translateDirection * translateYFactor * maxTranslate * translateWeight * translateDamping;

  const zoneWeight = zone === 'center'
    ? 0.92
    : zone === 'corner'
      ? 1.18
      : 1.04;
  const minDimension = Math.min(w, h);
  const curvatureFactor = 0.88 + curvature * 0.24;
  const edgeProximity = Math.max(edgeX, edgeY);
  const contactRadius = clamp(
    minDimension * (0.16 + (1 - edgeProximity) * 0.06 - (curvatureFactor - 1) * 0.04),
    minDimension * 0.08,
    minDimension * 0.26,
  );
  const force = curvature > 0
    ? (8 + minDimension * 0.05)
      * (0.58 + s * 0.52 + d * 6.4)
      * zoneWeight
      * curvatureFactor
    : 0;

  return {
    scaleX,
    scaleY,
    translateX,
    translateY,
    contour: {
      contactX: nx,
      contactY: ny,
      force,
      contactRadius,
    },
    mode,
    zone,
  };
}

/**
 * Helper: determine if an edge proximity value is "at the edge" on X axis.
 * @param edgeProximity - Value in [0,1] where 1 = at element boundary.
 */
function isEdgeX(edgeProximity: number): boolean {
  return edgeProximity >= EDGE_THRESHOLD;
}

/**
 * Helper: determine if an edge proximity value is "at the edge" on Y axis.
 * @param edgeProximity - Value in [0,1] where 1 = at element boundary.
 */
function isEdgeY(edgeProximity: number): boolean {
  return edgeProximity >= EDGE_THRESHOLD;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
