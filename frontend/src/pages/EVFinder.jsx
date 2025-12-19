import { useEffect, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "./EVFinder.css";

/* ===============================
   FIX LEAFLET ICON ISSUE
================================ */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ===============================
   CUSTOM ICONS
================================ */
const userIcon = new L.Icon({
  iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const stationIcon = new L.Icon({
  iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

/* ===============================
   MAP HELPERS
================================ */
function FixMapResize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14, { duration: 1.2 });
    }
  }, [position, map]);
  return null;
}

/* ===============================
   MAIN COMPONENT
================================ */
export default function EVFinder() {
  const [location, setLocation] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [radius, setRadius] = useState("");
  const [available, setAvailable] = useState(false);

  const [hasSearched, setHasSearched] = useState(false); // 🔥 KEY STATE
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [mapKey, setMapKey] = useState(0);

  /* ===============================
     GET USER LOCATION
================================ */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => alert("Location permission denied"),
      { enableHighAccuracy: true }
    );
  }, []);

  /* ===============================
     SEARCH CHARGERS
================================ */
  const searchChargers = async () => {
    if (!location) return;

    try {
      const res = await axios.get(
        "http://localhost:8000/api/chargers/search/",
        {
          params: {
            lat: location.lat,
            lon: location.lon,
            radius,
            available,
          },
        }
      );

      setChargers(res.data);
      setHasSearched(true); // ✅ SHOW SECTION ONLY AFTER SEARCH
      setMapKey((k) => k + 1);
    } catch (err) {
      alert("Enter radius");
    }
  };

  if (!location) return <p>Tracking you......</p>;

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        ⚡ LET&apos;S GET CHARGED
      </header>

      <div className="main">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <h3>Search Filters</h3>

          <label>Radius (KM)</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />

          <div className="checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              <span>Available only</span>
            </label>
          </div>

          <button style={{background:"red"}} onClick={searchChargers}>
          🔍 Search
          </button>

          {/* ===============================
              SHOW ONLY AFTER SEARCH
          ============================== */}
          {hasSearched && (
            <>
              <h3 style={{ marginTop: "20px" }}>
                Charging Stations
              </h3>

              <div className="station-list">
                {chargers.length === 0 && (
                  <p>No stations found</p>
                )}

                {chargers.map((c) => (
                  <div
                    key={c.id}
                    className="station-card"
                    onClick={() =>
                      setSelectedPosition([
                        c.latitude,
                        c.longitude,
                      ])
                    }
                  >
                    <b>{c.name}</b>
                    <p>⚡ {c.power_kw} kW</p>

                    <span
                      className={
                        c.is_available ? "green" : "red"
                      }
                    >
                      {c.is_available
                        ? "Available"
                        : "Unavailable"}
                    </span>

                    <p>📍 {c.distance} km</p>

                    <button
                      className="direction-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lon}&destination=${c.latitude},${c.longitude}`,
                          "_blank"
                        );
                      }}
                    >
                      🧭 Get Directions
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* MAP */}
        <section
          className="map-area"
          style={{ height: "calc(100vh - 90px)" }}
        >
          <MapContainer
            key={mapKey}
            center={[location.lat, location.lon]}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
          >
            <FixMapResize />
            <FlyToLocation position={selectedPosition} />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker
              position={[location.lat, location.lon]}
              icon={userIcon}
            >
              <Popup>You are here</Popup>
            </Marker>

            {chargers.map((c) => (
              <Marker
                key={c.id}
                position={[c.latitude, c.longitude]}
                icon={stationIcon}
              >
                <Popup>
                  <b>{c.name}</b>
                  <br />
                  ⚡ {c.power_kw} kW
                  <br />
                  📍 {c.distance} km
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>
      </div>
    </div>
  );
}
