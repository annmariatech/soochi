
"""
A4 reference detection for the fabric-scrap CV module.

This step detects the paper and rectifies its perspective.
Scrap measurements will be connected to this calibration in a later step.
"""

import cv2
import numpy as np


# Physical dimensions of an A4 sheet, in centimetres.
A4_WIDTH_CM = 21.0
A4_HEIGHT_CM = 29.7

# The rectified paper image will use this many pixels per centimetre.
# This is an output-image scale, not yet the scale of the original photo.
RECTIFIED_PIXELS_PER_CM = 20
MIN_SCRAP_AREA_CM2 = 1.0


def _decode_image(image_bytes: bytes):
    """Convert uploaded image bytes into an OpenCV colour image."""
    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image or unsupported image format.")

    return image


def _order_corners(points):
    """
    Order four points as top-left, top-right, bottom-right, bottom-left.

    This ordering is needed by OpenCV's perspective transformation.
    """
    points = np.asarray(points, dtype=np.float32)
    ordered = np.zeros((4, 2), dtype=np.float32)

    sums = points.sum(axis=1)
    differences = np.diff(points, axis=1).reshape(-1)

    ordered[0] = points[np.argmin(sums)]          # Top-left
    ordered[2] = points[np.argmax(sums)]          # Bottom-right
    ordered[1] = points[np.argmin(differences)]   # Top-right
    ordered[3] = points[np.argmax(differences)]   # Bottom-left

    return ordered


def _find_a4_corners(image):
    """
    Find the most plausible A4-shaped quadrilateral.

    Returns four ordered corners, or None if no suitable candidate
    is found. This is a heuristic and works best with a plain,
    contrasting background and all four paper edges visible.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Try both edge detection and threshold-based segmentation.
    _, otsu = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    edges = cv2.Canny(blurred, 50, 150)

    candidates = []

    for mask in (edges, otsu, cv2.bitwise_not(otsu)):
        # Close small gaps in the paper outline.
        kernel = np.ones((5, 5), dtype=np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(
            mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            perimeter = cv2.arcLength(contour, True)

            if perimeter <= 0:
                continue

            # Approximate the contour using fewer points.
            approx = cv2.approxPolyDP(
                contour, 0.02 * perimeter, True
            )

            if len(approx) != 4:
                continue

            if not cv2.isContourConvex(approx):
                continue

            area = cv2.contourArea(approx)
            image_area = image.shape[0] * image.shape[1]

            # Ignore tiny quadrilaterals and near-full-image contours.
            if area < image_area * 0.05:
                continue

            if area > image_area * 0.98:
                continue

            corners = _order_corners(approx.reshape(4, 2))

            # Estimate the average lengths of opposite sides.
            top_left, top_right, bottom_right, bottom_left = corners

            top = np.linalg.norm(top_right - top_left)
            bottom = np.linalg.norm(bottom_right - bottom_left)
            left = np.linalg.norm(bottom_left - top_left)
            right = np.linalg.norm(bottom_right - top_right)

            average_width = (top + bottom) / 2
            average_height = (left + right) / 2

            if min(average_width, average_height) <= 0:
                continue

            ratio = min(
                average_width / average_height,
                average_height / average_width,
            )

            # A4's short-side/long-side ratio is approximately 0.707.
            # Allow for perspective and detection inaccuracies without
            # accepting broad fabric pieces as A4 sheets.
            if not 0.60 <= ratio <= 0.72:
                continue

            # Prefer large, well-defined candidates.
            score = area * (1.0 - abs(ratio - (21 / 29.7)))

            candidates.append((score, corners))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def detect_a4_reference(image_bytes: bytes) -> dict:
    """
    Detect an A4 reference sheet and rectify its perspective.

    Returns:
        success: whether a plausible reference was found
        error: error message, or None
        corners: four image-coordinate points, or None
        annotated_image_png: image with detected paper outline
        rectified_paper_png: perspective-corrected paper image
    """
    try:
        image = _decode_image(image_bytes)
    except ValueError as exc:
        return {
            "success": False,
            "error": str(exc),
            "corners": None,
            "annotated_image_png": None,
            "rectified_paper_png": None,
        }

    corners = _find_a4_corners(image)

    if corners is None:
        return {
            "success": False,
            "error": (
                "Could not detect an A4-shaped sheet. Make sure the "
                "entire sheet is visible against a contrasting background."
            ),
            "corners": None,
            "annotated_image_png": None,
            "rectified_paper_png": None,
        }

    # Calculate the output dimensions for a front-facing A4 image.
    output_width = round(A4_WIDTH_CM * RECTIFIED_PIXELS_PER_CM)
    output_height = round(A4_HEIGHT_CM * RECTIFIED_PIXELS_PER_CM)

    source_points = corners.astype(np.float32)

    destination_points = np.array(
        [
            [0, 0],
            [output_width - 1, 0],
            [output_width - 1, output_height - 1],
            [0, output_height - 1],
        ],
        dtype=np.float32,
    )

    # Compute the transformation that makes the paper rectangular.
    transform = cv2.getPerspectiveTransform(
        source_points, destination_points
    )

    rectified = cv2.warpPerspective(
        image, transform, (output_width, output_height)
    )

    # Draw the detected paper outline on a copy of the original image.
    annotated = image.copy()
    cv2.polylines(
        annotated,
        [corners.astype(np.int32)],
        isClosed=True,
        color=(0, 255, 0),
        thickness=3,
    )

    # Mark each detected corner so mistakes are easy to spot.
    for index, point in enumerate(corners):
        x, y = point.astype(int)
        cv2.circle(annotated, (x, y), 7, (0, 0, 255), -1)
        cv2.putText(
            annotated,
            str(index + 1),
            (x + 8, y - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 0, 0),
            2,
        )

    success, annotated_buffer = cv2.imencode(".png", annotated)
    if not success:
        raise ValueError("Could not encode annotated image.")

    success, rectified_buffer = cv2.imencode(".png", rectified)
    if not success:
        raise ValueError("Could not encode rectified paper image.")

    return {
        "success": True,
        "error": None,
        "corners": [
            [round(float(x), 2), round(float(y), 2)]
            for x, y in corners
        ],
        "annotated_image_png": annotated_buffer.tobytes(),
        "rectified_paper_png": rectified_buffer.tobytes(),
    }


def _encode_png(image):
    """Convert an OpenCV image to PNG bytes."""
    success, buffer = cv2.imencode(".png", image)
    if not success:
        raise ValueError("Could not encode image as PNG.")
    return buffer.tobytes()

def _touches_image_border(contour, image_shape, margin=2):
    """Reject contours touching the photograph's outer boundary."""
    image_h, image_w = image_shape[:2]
    x, y, w, h = cv2.boundingRect(contour)

    return (
        x <= margin
        or y <= margin
        or x + w >= image_w - margin
        or y + h >= image_h - margin
    )


def _dominant_color(image, contour, x, y, w, h):
    """Find the largest of three color clusters inside a scrap."""
    crop = image[y:y + h, x:x + w]

    local_contour = contour.copy()
    local_contour[:, 0, 0] -= x
    local_contour[:, 0, 1] -= y

    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.drawContours(mask, [local_contour], -1, 255, -1)

    pixels = crop[mask > 0]

    if len(pixels) == 0:
        return "#000000"

    # Sample large scraps to keep k-means reasonably fast.
    if len(pixels) > 10000:
        indices = np.linspace(
            0, len(pixels) - 1, 10000, dtype=np.int32
        )
        pixels = pixels[indices]

    samples = np.float32(pixels)
    k = min(3, len(samples))

    if k == 1:
        dominant = samples[0]
    else:
        criteria = (
            cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
            50,
            0.2,
        )

        _, labels, centers = cv2.kmeans(
            samples,
            k,
            None,
            criteria,
            3,
            cv2.KMEANS_PP_CENTERS,
        )

        counts = np.bincount(labels.flatten(), minlength=k)
        dominant = centers[int(np.argmax(counts))]

    b, g, r = np.clip(np.round(dominant), 0, 255).astype(np.uint8)
    return f"#{int(r):02X}{int(g):02X}{int(b):02X}"


def _rectify_full_image(image, corners):
    """
    Perspective-correct the entire image using the A4 corners.

    The rectified A4 sheet is 21 x 29.7 cm. At 20 pixels per cm,
    its output size is 420 x 594 pixels.

    Return the corrected image, adjusted transformation matrix,
    and the A4 rectangle in corrected-image coordinates.
    """
    scale = RECTIFIED_PIXELS_PER_CM
    paper_w = round(A4_WIDTH_CM * scale)
    paper_h = round(A4_HEIGHT_CM * scale)

    destination = np.array(
        [
            [0, 0],
            [paper_w - 1, 0],
            [paper_w - 1, paper_h - 1],
            [0, paper_h - 1],
        ],
        dtype=np.float32,
    )

    transform = cv2.getPerspectiveTransform(
        corners.astype(np.float32), destination
    )

    # Map the four corners of the original image into the corrected plane.
    image_h, image_w = image.shape[:2]
    image_corners = np.array(
        [[
            [0, 0],
            [image_w - 1, 0],
            [image_w - 1, image_h - 1],
            [0, image_h - 1],
        ]],
        dtype=np.float32,
    )

    transformed_corners = cv2.perspectiveTransform(
        image_corners, transform
    )[0]

    min_xy = np.floor(transformed_corners.min(axis=0))
    max_xy = np.ceil(transformed_corners.max(axis=0))

    output_w, output_h = (max_xy - min_xy + 1).astype(int)

    # Avoid unexpectedly huge output images from a bad perspective estimate.
    if (
        output_w <= 0
        or output_h <= 0
        or output_w * output_h > 40_000_000
    ):
        raise ValueError(
            "Perspective correction produced an unreasonable image size. "
            "Take the photo more directly from above."
        )

    # Shift the transformed image so its coordinates start at (0, 0).
    shift = np.array(
        [
            [1, 0, -min_xy[0]],
            [0, 1, -min_xy[1]],
            [0, 0, 1],
        ],
        dtype=np.float64,
    )

    adjusted_transform = shift @ transform

    rectified = cv2.warpPerspective(
        image,
        adjusted_transform,
        (int(output_w), int(output_h)),
    )

    # Transform the paper corners into the corrected image.
    paper_polygon = cv2.perspectiveTransform(
        corners.reshape(1, 4, 2).astype(np.float32),
        adjusted_transform,
    )[0]

    return rectified, adjusted_transform, paper_polygon


def detect_scraps(
    image_bytes: bytes,
    marker_cm: float = 5.0,
    px_per_cm: float | None = None,
) -> dict:
    """
    Detect and measure fabric scraps using an A4 reference.

    marker_cm is retained for compatibility with the existing interface;
    A4 calibration always uses the known A4 dimensions instead.

    px_per_cm is a manual fallback for photos where A4 detection fails.

    Scrap polygons are returned in ORIGINAL photo pixel coordinates.
    Cropped images and the annotated image are PNG bytes.
    """
    try:
        image = _decode_image(image_bytes)
    except ValueError as exc:
        return {
            "success": False,
            "error": str(exc),
            "px_per_cm": None,
            "annotated_image_png": None,
            "scraps": [],
        }

    corners = _find_a4_corners(image)
    transform = None
    paper_polygon = None

    if corners is not None:
        try:
            rectified, transform, paper_polygon = _rectify_full_image(
                image, corners
            )
            pixels_per_cm = float(RECTIFIED_PIXELS_PER_CM)
        except (ValueError, cv2.error) as exc:
            return {
                "success": False,
                "error": str(exc),
                "px_per_cm": None,
                "annotated_image_png": None,
                "scraps": [],
            }
    elif px_per_cm is not None and px_per_cm > 0:
        # Manual calibration assumes the supplied scale applies uniformly
        # across the image. It does not correct perspective distortion.
        rectified = image.copy()
        pixels_per_cm = float(px_per_cm)
    else:
        return {
            "success": False,
            "error": (
                "A4 reference not detected. Ensure the full sheet is "
                "visible against a contrasting background, or supply "
                "px_per_cm for manual calibration."
            ),
            "px_per_cm": None,
            "annotated_image_png": None,
            "scraps": [],
        }

    min_area_px = MIN_SCRAP_AREA_CM2 * pixels_per_cm**2

        # Identify pixels that came from the original photograph.
    # Perspective correction creates black pixels outside the photo.
    if transform is not None:
        original_valid_mask = np.full(
            image.shape[:2], 255, dtype=np.uint8
        )

        valid_region = cv2.warpPerspective(
            original_valid_mask,
            transform,
            (rectified.shape[1], rectified.shape[0]),
            flags=cv2.INTER_NEAREST,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=0,
        )
    else:
        # Manual calibration does not create a transformed canvas.
        valid_region = np.full(
            rectified.shape[:2], 255, dtype=np.uint8
        )

    annotated = rectified.copy()
    gray = cv2.cvtColor(rectified, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Compare Otsu and adaptive thresholding, including both polarities.
    _, otsu = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    adaptive = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        5,
    )

    candidates = [
        otsu,
        cv2.bitwise_not(otsu),
        adaptive,
        cv2.bitwise_not(adaptive),
    ]

    # Exclude the A4 sheet from scrap detection.
    # For this initial version, scraps should be placed beside the paper.
        # Ignore artificial pixels outside the original photograph.
    for mask in candidates:
        mask[valid_region == 0] = 0

    # Exclude the A4 sheet from scrap detection.
    # Place scraps beside the sheet, not on top of it.
    if paper_polygon is not None:
        paper_mask = np.zeros(gray.shape, dtype=np.uint8)

        cv2.fillPoly(
            paper_mask,
            [np.round(paper_polygon).astype(np.int32)],
            255,
        )

        for mask in candidates:
            mask[paper_mask > 0] = 0

    # Choose the threshold with the most plausible usable contours.
    best_score = 0
    best_mask = None

    for mask in candidates:
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        valid = [
            contour
            for contour in contours
            if (
                cv2.contourArea(contour) >= min_area_px
                and not _touches_image_border(contour, rectified.shape)
            )
        ]

        score = min(len(valid), 20)

        if score > best_score:
            best_score = score
            best_mask = mask.copy()

    scraps = []

    if best_mask is not None:
        contours, _ = cv2.findContours(
            best_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        # Sort by position to keep temporary IDs reasonably predictable.
        contours = sorted(
            contours,
            key=cv2.contourArea,
            reverse=True
        )

        for contour in contours:
            contour_area_px = cv2.contourArea(contour)

            if contour_area_px < min_area_px:
                continue

            if _touches_image_border(contour, rectified.shape):
                continue

            rect = cv2.minAreaRect(contour)
            (_, _), (rw, rh), _ = rect

            if rw <= 0 or rh <= 0:
                continue

            width_cm, height_cm = sorted(
                (rw / pixels_per_cm, rh / pixels_per_cm)
            )

            area_cm2 = contour_area_px / (pixels_per_cm**2)

            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(
                contour, max(1.0, 0.01 * perimeter), True
            )

            x, y, w, h = cv2.boundingRect(contour)

            color_hex = _dominant_color(
                rectified, contour, x, y, w, h
            )

            crop = rectified[y:y + h, x:x + w].copy()

            # Convert polygon points back to the original photo's
            # pixel coordinates when A4 perspective correction was used.
            if transform is not None:
                inverse_transform = np.linalg.inv(transform)
                original_polygon = cv2.perspectiveTransform(
                    approx.astype(np.float32),
                    inverse_transform,
                )
            else:
                original_polygon = approx.astype(np.float32)

            polygon = [
                [int(round(point[0][0])), int(round(point[0][1]))]
                for point in original_polygon
            ]

            cv2.drawContours(
                annotated, [approx], -1, (0, 200, 0), 2
            )

            label = f"{width_cm:.1f} x {height_cm:.1f} cm"
            label_x = max(0, x)
            label_y = max(20, y - 8)

            cv2.putText(
                annotated,
                label,
                (label_x, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )

            scraps.append({
                "temp_id": f"scrap_{len(scraps) + 1}",
                "width_cm": round(float(width_cm), 2),
                "height_cm": round(float(height_cm), 2),
                "area_cm2": round(float(area_cm2), 2),
                "color_hex": color_hex,
                "polygon": polygon,
                "crop_png": _encode_png(crop),
            })

    # The annotation shows the corrected image with detected scraps.
    return {
        "success": True,
        "error": None,
        "px_per_cm": pixels_per_cm,
        "annotated_image_png": _encode_png(annotated),
        "scraps": scraps,
    }
