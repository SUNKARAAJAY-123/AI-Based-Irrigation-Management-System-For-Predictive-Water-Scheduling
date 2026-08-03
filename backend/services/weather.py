import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from backend.utils.config import settings

logger = logging.getLogger("WeatherService")

_CACHE: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}
_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_MAX_RETRIES = 3


class WeatherServiceError(RuntimeError):
    """Raised when a weather provider cannot return a valid response."""


def _weather_description(code: Optional[int]) -> str:
    codes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
        55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
        71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
        81: "Rain showers", 82: "Heavy rain showers", 95: "Thunderstorm",
        96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
    }
    return codes.get(code, "Unknown conditions")


def _to_iso(value: str) -> str:
    """Return an ISO-8601 value with a timezone for browser-safe parsing."""
    if value.endswith("Z") or "+" in value[10:]:
        return value
    return f"{value}:00+00:00" if len(value) == 16 else value


def _number_list(payload: Dict[str, Any], key: str) -> List[Any]:
    value = payload.get(key, [])
    return value if isinstance(value, list) else []


def _value_at(values: List[Any], index: int, default: Any = 0) -> Any:
    return values[index] if index < len(values) and values[index] is not None else default


def _fallback_weather(lat: float, lon: float) -> Dict[str, Any]:
    """Provide deterministic, clearly bounded offline data with dynamic dates."""
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    base_temp = round(22 + (abs(lat) % 15), 1)
    humidity = min(95, max(30, 60 + int(abs(lon) % 25)))
    wind = round(5 + (abs(lat + lon) % 15), 1)
    hourly: List[Dict[str, Any]] = []
    daily: List[Dict[str, Any]] = []
    for index in range(24):
        point = now + timedelta(hours=index)
        rain_probability = 0.65 if index in (8, 9) else 0.15
        hourly.append({
            "time": point.isoformat(), "temperature": round(base_temp + (index % 5 - 2) * 0.4, 1),
            "humidity": humidity, "wind_speed": wind, "pressure": 1013.0,
            "cloud_cover": 35, "uv_index": max(0.0, 7.0 - abs(12 - point.hour) * 0.7),
            "rain_probability": rain_probability,
            "description": "Rain showers" if rain_probability >= 0.5 else "Partly cloudy",
        })
    for index in range(7):
        day = (now + timedelta(days=index)).date()
        rain_probability = 0.65 if index == 1 else 0.15
        daily.append({
            "date": day.isoformat(), "temp_max": round(base_temp + 3, 1), "temp_min": round(base_temp - 4, 1),
            "rain_probability": rain_probability, "wind_speed": wind, "uv_index": 7.0,
            "sunrise": datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc).replace(hour=6).isoformat(),
            "sunset": datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc).replace(hour=18).isoformat(),
            "description": "Rain showers" if rain_probability >= 0.5 else "Partly cloudy",
        })
    return _normalise_weather({
        "current": hourly[0], "hourly": hourly, "daily": daily,
    })


def _normalise_weather(data: Dict[str, Any]) -> Dict[str, Any]:
    current = data["current"]
    daily = data["daily"]
    forecast = [
        {
            "dt_txt": f"{item['date']}T12:00:00+00:00",
            "temp": item["temp_max"],
            "humidity": current["humidity"],
            "wind_speed": item["wind_speed"],
            "rain_probability": item["rain_probability"],
            "description": item["description"],
        }
        for item in daily
    ]
    return {
        "temp": current["temperature"], "humidity": current["humidity"],
        "wind_speed": current["wind_speed"], "conditions": current["description"],
        "forecast": forecast, "current": current, "hourly": data["hourly"], "daily": daily,
    }


def _parse_open_meteo(payload: Dict[str, Any]) -> Dict[str, Any]:
    current_raw = payload.get("current")
    hourly_raw = payload.get("hourly")
    daily_raw = payload.get("daily")
    if not isinstance(current_raw, dict) or not isinstance(hourly_raw, dict) or not isinstance(daily_raw, dict):
        raise WeatherServiceError("Weather provider returned an incomplete response")

    hourly_times = _number_list(hourly_raw, "time")
    if not hourly_times:
        raise WeatherServiceError("Weather provider returned no hourly forecast")

    def current_value(key: str, default: Any = 0) -> Any:
        value = current_raw.get(key, default)
        return default if value is None else value

    current = {
        "time": _to_iso(str(current_value("time"))),
        "temperature": float(current_value("temperature_2m")),
        "humidity": int(current_value("relative_humidity_2m")),
        "wind_speed": float(current_value("wind_speed_10m")),
        "pressure": float(current_value("surface_pressure")) if current_raw.get("surface_pressure") is not None else None,
        "cloud_cover": int(current_value("cloud_cover")) if current_raw.get("cloud_cover") is not None else None,
        "uv_index": None,
        "rain_probability": 0.0,
        "description": _weather_description(current_raw.get("weather_code")),
    }

    humidity = _number_list(hourly_raw, "relative_humidity_2m")
    wind = _number_list(hourly_raw, "wind_speed_10m")
    pressure = _number_list(hourly_raw, "surface_pressure")
    clouds = _number_list(hourly_raw, "cloud_cover")
    uv = _number_list(hourly_raw, "uv_index")
    rain = _number_list(hourly_raw, "precipitation_probability")
    temperatures = _number_list(hourly_raw, "temperature_2m")
    codes = _number_list(hourly_raw, "weather_code")
    hourly = []
    for index, point in enumerate(hourly_times[:168]):
        hourly.append({
            "time": _to_iso(str(point)), "temperature": float(_value_at(temperatures, index)),
            "humidity": int(_value_at(humidity, index)), "wind_speed": float(_value_at(wind, index)),
            "pressure": float(_value_at(pressure, index)) if _value_at(pressure, index, None) is not None else None,
            "cloud_cover": int(_value_at(clouds, index)) if _value_at(clouds, index, None) is not None else None,
            "uv_index": float(_value_at(uv, index)) if _value_at(uv, index, None) is not None else None,
            "rain_probability": float(_value_at(rain, index)) / 100,
            "description": _weather_description(_value_at(codes, index, None)),
        })
    if hourly:
        current["rain_probability"] = hourly[0]["rain_probability"]
        current["uv_index"] = hourly[0]["uv_index"]

    dates = _number_list(daily_raw, "time")
    max_temp = _number_list(daily_raw, "temperature_2m_max")
    min_temp = _number_list(daily_raw, "temperature_2m_min")
    max_rain = _number_list(daily_raw, "precipitation_probability_max")
    max_wind = _number_list(daily_raw, "wind_speed_10m_max")
    max_uv = _number_list(daily_raw, "uv_index_max")
    sunrise = _number_list(daily_raw, "sunrise")
    sunset = _number_list(daily_raw, "sunset")
    daily_codes = _number_list(daily_raw, "weather_code")
    daily = [
        {
            "date": str(point), "temp_max": float(_value_at(max_temp, index)), "temp_min": float(_value_at(min_temp, index)),
            "rain_probability": float(_value_at(max_rain, index)) / 100, "wind_speed": float(_value_at(max_wind, index)),
            "uv_index": float(_value_at(max_uv, index)) if _value_at(max_uv, index, None) is not None else None,
            "sunrise": _to_iso(str(_value_at(sunrise, index))) if _value_at(sunrise, index, None) else None,
            "sunset": _to_iso(str(_value_at(sunset, index))) if _value_at(sunset, index, None) else None,
            "description": _weather_description(_value_at(daily_codes, index, None)),
        }
        for index, point in enumerate(dates[:7])
    ]
    if not daily:
        raise WeatherServiceError("Weather provider returned no daily forecast")
    return _normalise_weather({"current": current, "hourly": hourly, "daily": daily})


async def _fetch_open_meteo(lat: float, lon: float) -> Dict[str, Any]:
    if settings.WEATHER_PROVIDER.lower() != "open_meteo":
        raise WeatherServiceError(f"Unsupported weather provider: {settings.WEATHER_PROVIDER}")
    params = {
        "latitude": lat, "longitude": lon, "timezone": "auto", "forecast_days": 7,
        "current": "temperature_2m,relative_humidity_2m,weather_code,cloud_cover,surface_pressure,wind_speed_10m",
        "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,surface_pressure,uv_index",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset",
    }
    headers = {"Accept": "application/json"}
    if settings.WEATHER_API_KEY:
        headers["Authorization"] = f"Bearer {settings.WEATHER_API_KEY}"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        for attempt in range(_MAX_RETRIES):
            try:
                response = await client.get(settings.WEATHER_BASE_URL, params=params, headers=headers)
                response.raise_for_status()
                return _parse_open_meteo(response.json())
            except (httpx.HTTPError, ValueError, WeatherServiceError) as error:
                if attempt == _MAX_RETRIES - 1:
                    raise WeatherServiceError("Weather provider request failed") from error
                await asyncio.sleep(2 ** attempt)


async def fetch_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch current, hourly and seven-day weather with a 15-minute in-memory cache."""
    cache_key = (round(lat, 3), round(lon, 3))
    cached = _CACHE.get(cache_key)
    if cached and time.monotonic() - cached[0] < settings.WEATHER_CACHE_TTL_SECONDS:
        return cached[1]
    try:
        weather_data = await _fetch_open_meteo(lat, lon)
        _CACHE[cache_key] = (time.monotonic(), weather_data)
        return weather_data
    except WeatherServiceError:
        logger.warning("Weather request failed for latitude=%s longitude=%s; using dynamic offline data", lat, lon)
        weather_data = _fallback_weather(lat, lon)
        _CACHE[cache_key] = (time.monotonic(), weather_data)
        return weather_data


async def weather_health_check() -> Dict[str, Any]:
    """Check provider reachability without leaking credentials."""
    try:
        await _fetch_open_meteo(0.0, 0.0)
        return {"status": "healthy", "provider": settings.WEATHER_PROVIDER}
    except WeatherServiceError as error:
        logger.warning("Weather health check failed: %s", error)
        return {"status": "degraded", "provider": settings.WEATHER_PROVIDER}
