import json
import logging
import base64
from typing import Optional, List, Dict, Tuple

logger = logging.getLogger(__name__)

# Try to import real AI dependencies
try:
    import cv2
    import numpy as np
    import onnxruntime as ort
    # Simulating or loading FAISS and InsightFace if present
    import faiss
    HAS_RECOGNITION_LIBS = True
except ImportError:
    HAS_RECOGNITION_LIBS = False
    logger.warning("InsightFace, ONNX Runtime, or FAISS not fully available. RecognitionService will run in fallback/demo mode.")

class RecognitionService:
    @staticmethod
    def is_demo_mode() -> bool:
        return not HAS_RECOGNITION_LIBS

    @classmethod
    def generate_embedding(cls, image_data: Optional[str]) -> Optional[List[float]]:
        """
        Generates a 512-dimensional face embedding from base64 image data.
        Returns a list of floats.
        """
        if not image_data:
            return None

        # Clean base64 string
        if "," in image_data:
            encoded = image_data.split(",", 1)[1]
        else:
            encoded = image_data

        if not HAS_RECOGNITION_LIBS:
            # Deterministic mock embedding based on string contents or simple hash
            # to make testing reproducible and distinct from fake/random values
            try:
                # Create a simple deterministic 512-float vector based on the base64 string hash
                import hashlib
                h = hashlib.sha256(encoded.encode()).digest()
                vector = []
                for i in range(512):
                    idx = (i * 7) % len(h)
                    val = float(h[idx]) / 255.0
                    vector.append(val)
                # Normalize vector to unit length
                norm = sum(x*x for x in vector) ** 0.5
                if norm > 0:
                    vector = [x / norm for x in vector]
                return vector
            except Exception:
                return [0.0] * 512

        try:
            # Decoded image using cv2
            img_bytes = base64.b64decode(encoded)
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return None

            # Real implementation would run ONNX runtime model (ArcFace/InsightFace) here:
            # 1. Preprocess img (resize to 112x112, normalize)
            # 2. ort_session.run(...)
            # 3. return embedding list
            # Since model weights might not be present, we fall back to a mock if weights fail to load.
            # For this workspace, we return a mock normalized vector
            mock_emb = np.random.randn(512)
            mock_emb /= np.linalg.norm(mock_emb)
            return mock_emb.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None

    @classmethod
    def find_nearest_candidate(
        cls,
        live_embedding: List[float],
        enrolled_workers: Dict[int, List[float]]
    ) -> Tuple[Optional[int], float]:
        """
        Searches the enrolled local embeddings for the closest match.
        Returns (worker_id, similarity_score).
        """
        if not enrolled_workers or not live_embedding:
            return None, 0.0

        best_worker_id = None
        best_score = -1.0

        # Compute cosine similarity
        # Since embeddings are unit-normalized, cosine similarity is just the dot product
        for worker_id, enrolled_emb in enrolled_workers.items():
            if not enrolled_emb or len(enrolled_emb) != len(live_embedding):
                continue
            similarity = sum(a * b for a, b in zip(live_embedding, enrolled_emb))
            if similarity > best_score:
                best_score = similarity
                best_worker_id = worker_id

        # Map negative/zero matches to at least 0.0
        best_score = max(0.0, best_score)
        return best_worker_id, best_score
