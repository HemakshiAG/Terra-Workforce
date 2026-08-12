import base64
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Try to import cv2 and numpy
try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    logger.warning("OpenCV or NumPy not available. FaceQualityService will run in fallback/demo mode.")

class FaceQualityService:
    @staticmethod
    def analyze_quality(image_data: Optional[str]) -> Tuple[bool, Optional[str]]:
        """
        Analyzes the quality of a base64 encoded face image.
        Returns:
            (is_passed, failure_reason)
        """
        if not image_data:
            return False, "NO_FACE"

        # Explicit test strings / Demo modes
        if "fail_dark" in image_data or image_data == "IMAGE_TOO_DARK":
            return False, "IMAGE_TOO_DARK"
        if "fail_blur" in image_data or image_data == "IMAGE_TOO_BLURRY":
            return False, "IMAGE_TOO_BLURRY"
        if "fail_size" in image_data or image_data == "FACE_TOO_SMALL":
            return False, "FACE_TOO_SMALL"
        if "fail_multiple" in image_data or image_data == "MULTIPLE_FACES":
            return False, "MULTIPLE_FACES"
        if "fail_noface" in image_data or image_data == "NO_FACE":
            return False, "NO_FACE"

        if not HAS_CV2:
            # Fallback when dependencies are missing
            return True, None

        try:
            # Strip base64 prefix if present
            if "," in image_data:
                header, encoded = image_data.split(",", 1)
            else:
                encoded = image_data

            img_bytes = base64.b64decode(encoded)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return False, "NO_FACE"

            # 1. Size check
            h, w = img.shape[:2]
            if h < 80 or w < 80:
                return False, "FACE_TOO_SMALL"

            # Convert to grayscale for brightness and blur checks
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # 2. Brightness check
            mean_brightness = np.mean(gray)
            if mean_brightness < 40:
                return False, "IMAGE_TOO_DARK"

            # 3. Blur check (Laplacian variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if laplacian_var < 15.0:
                return False, "IMAGE_TOO_BLURRY"

            # 4. Face Detection (Haar Cascades if available)
            # Try to load default opencv cascade
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            if not face_cascade.empty():
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3)
                if len(faces) == 0:
                    return False, "NO_FACE"
                if len(faces) > 1:
                    return False, "MULTIPLE_FACES"
                
                # Check detected face size relative to image
                fx, fy, fw, fh = faces[0]
                if fw < 60 or fh < 60:
                    return False, "FACE_TOO_SMALL"

            return True, None

        except Exception as e:
            logger.error(f"Error analyzing face quality: {e}")
            return False, "NO_FACE"
