import math
from typing import Optional, Tuple
from backend.app.models import LocationStatus

class GeofenceService:
    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000.0  # Earth's radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @classmethod
    def verify_location(
        cls,
        worker_lat: Optional[float],
        worker_lon: Optional[float],
        worksite_lat: Optional[float],
        worksite_lon: Optional[float],
        geofence_radius: float
    ) -> Tuple[LocationStatus, Optional[float]]:
        if worker_lat is None or worker_lon is None:
            return LocationStatus.UNAVAILABLE, None
        
        if worksite_lat is None or worksite_lon is None:
            return LocationStatus.WITHIN_GEOFENCE, 0.0

        distance = cls.haversine(worker_lat, worker_lon, worksite_lat, worksite_lon)
        if distance <= geofence_radius:
            return LocationStatus.WITHIN_GEOFENCE, distance
        return LocationStatus.OUTSIDE_GEOFENCE, distance
