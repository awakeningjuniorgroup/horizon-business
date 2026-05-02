import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Package,
  Navigation,
  CheckCircle,
  Phone,
  ShieldCheck,
  Cpu,
  Key,
  Bike,
  X,
  WifiOff,
} from "lucide-react";
import { assets } from "../assets/assets";
import { useAppContext } from "../context/AppContext";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet default icons issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const ANIMATION_DURATION = 60000;

const formatETA = (seconds) => {
  if (seconds === null || seconds === undefined) return "";
  if (seconds < 60) return `${Math.max(1, seconds)} sec`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} hr ${remMins > 0 ? `${remMins} min` : ""}`;
};

// Custom marker icons for Leaflet
const createMarkerIcon = (iconUrl, size = [35, 35]) => {
  return L.icon({
    iconUrl,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });
};

// Component for handling map interactions
const MapController = ({ riderPosition, isAutoPan, pickupLoc, dropoffLoc }) => {
  const map = useMap();

  useEffect(() => {
    if (isAutoPan && riderPosition) {
      map.panTo([riderPosition.lat, riderPosition.lng]);
    }
  }, [riderPosition, isAutoPan, map]);

  useEffect(() => {
    if (pickupLoc && dropoffLoc) {
      const bounds = L.latLngBounds(
        [pickupLoc.lat, pickupLoc.lng],
        [dropoffLoc.lat, dropoffLoc.lng],
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pickupLoc, dropoffLoc, map]);

  return null;
};

// --- Fonctions utilitaires ---
const getInterpolatedPosition = (path, progressPercent) => {
  if (!path || path.length === 0) return null;
  const index = (progressPercent / 100) * (path.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const t = index - lower;
  const p1 = path[lower];
  const p2 = path[upper] || p1;
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lng: p1.lng + (p2.lng - p1.lng) * t,
  };
};

const getSplitPaths = (pathPoints, progressPercent, currentPos) => {
  if (!pathPoints || pathPoints.length === 0) return { past: [], future: [] };
  const floatIndex = (progressPercent / 100) * (pathPoints.length - 1);
  const lowerIndex = Math.floor(floatIndex);
  const exactPos = currentPos || pathPoints[lowerIndex];

  return {
    past: [...pathPoints.slice(0, lowerIndex + 1), exactPos],
    future: [exactPos, ...pathPoints.slice(lowerIndex + 1)],
  };
};

const TrackingMap = ({ order, onClose }) => {
  const { backendUrl } = useAppContext();

  const pickupLoc = useMemo(
    () => order?.pickupCoordinates || { lat: 21.258, lng: 73.306 },
    [order],
  );
  const dropoffLoc = useMemo(
    () => order?.dropoffCoordinates || { lat: 21.2556, lng: 73.3047 },
    [order],
  );

  const [pathPoints, setPathPoints] = useState([]);
  const [progress, setProgress] = useState(0);
  const [riderPosition, setRiderPosition] = useState(pickupLoc);
  const [routeMeta, setRouteMeta] = useState({ distance: "", duration: "" });
  const [etaSec, setEtaSec] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isAutoPan, setIsAutoPan] = useState(true);

  const socketRef = useRef(null);
  const targetNotifiedRef = useRef(false);

  const isPickup = order?.status === "Ready for Pickup";
  const isDelivery = order?.status === "Out for Delivery";
  const assignedRider = order?.riderId || null;

  // Optimisation des tracés (useMemo)
  const splitPaths = useMemo(
    () => getSplitPaths(pathPoints, progress, riderPosition),
    [pathPoints, progress, riderPosition],
  );

  // Sockets avec gestion d'état de connexion
  useEffect(() => {
    if (!order?._id) return;
    socketRef.current = io(backendUrl);

    socketRef.current.on("connect", () => setIsConnected(true));
    socketRef.current.on("disconnect", () => setIsConnected(false));

    socketRef.current.emit("join_order", order._id);
    socketRef.current.on("live_location", (data) => {
      if (data.lat && data.lng) {
        setRiderPosition({ lat: data.lat, lng: data.lng });
        if (data.progress) setProgress(data.progress);
      }
    });

    return () => socketRef.current?.disconnect();
  }, [order?._id, backendUrl]);

  // Calcul de l'itinéraire (simule une route directe entre pickup et dropoff)
  useEffect(() => {
    if (isPickup || isDelivery) {
      // Crée une route simple entre les deux points
      const startPoint = isPickup ? pickupLoc : pickupLoc;
      const endPoint = isPickup ? pickupLoc : dropoffLoc;

      // Génère des points intermédiaires pour créer un chemin courbe
      const route = [];
      const steps = 50;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        route.push({
          lat: startPoint.lat + (endPoint.lat - startPoint.lat) * t,
          lng: startPoint.lng + (endPoint.lng - startPoint.lng) * t,
        });
      }

      setPathPoints(route);

      // Calcul simple de distance et durée
      const latDiff = Math.abs(endPoint.lat - startPoint.lat);
      const lngDiff = Math.abs(endPoint.lng - startPoint.lng);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // approximation km
      const duration = Math.ceil(distance / 40); // assumer 40 km/h

      setRouteMeta({
        distance: `${distance.toFixed(1)} km`,
        duration: `${duration} min`,
      });
    }
  }, [order?.status, pickupLoc, dropoffLoc, isPickup, isDelivery]);

  // Animation fluide
  useEffect(() => {
    if (pathPoints.length === 0 || (!isDelivery && !isPickup)) return;
    const startTime =
      (isPickup ? order.acceptedAt : order.pickedUpAt) || Date.now();
    let frameId;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / ANIMATION_DURATION, 1);

      const currentPct = pct * 100;
      setProgress(currentPct);
      const pos = getInterpolatedPosition(pathPoints, currentPct);
      if (pos) setRiderPosition(pos);
      setEtaSec(Math.max(0, Math.ceil((ANIMATION_DURATION - elapsed) / 1000)));

      if (pct >= 1 && !targetNotifiedRef.current) {
        targetNotifiedRef.current = true;
        socketRef.current?.emit("rider_arrived", { orderId: order._id });
      }
      if (pct < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [pathPoints, isDelivery, isPickup, order]);

  return (
    <div className="relative h-full w-full font-outfit rounded-3xl overflow-hidden border border-gray-200 shadow-lg bg-gray-50">
      <MapContainer
        center={[riderPosition.lat, riderPosition.lng]}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
        onDragStart={() => setIsAutoPan(false)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapController
          riderPosition={riderPosition}
          isAutoPan={isAutoPan}
          pickupLoc={pickupLoc}
          dropoffLoc={dropoffLoc}
        />

        {/* Route path */}
        {splitPaths.past && splitPaths.past.length > 0 && (
          <Polyline
            positions={splitPaths.past.map((p) => [p.lat, p.lng])}
            color="#94a3b8"
            weight={5}
            opacity={0.4}
          />
        )}
        {splitPaths.future && splitPaths.future.length > 0 && (
          <Polyline
            positions={splitPaths.future.map((p) => [p.lat, p.lng])}
            color="#10b981"
            weight={6}
            opacity={0.9}
          />
        )}

        {/* Markers */}
        <Marker
          position={[pickupLoc.lat, pickupLoc.lng]}
          icon={createMarkerIcon(assets.shop, [35, 35])}
        >
          <Popup>Lieu de Retrait</Popup>
        </Marker>

        <Marker
          position={[dropoffLoc.lat, dropoffLoc.lng]}
          icon={createMarkerIcon(assets.home, [35, 35])}
        >
          <Popup>Lieu de Livraison</Popup>
        </Marker>

        <Marker
          position={[riderPosition.lat, riderPosition.lng]}
          icon={createMarkerIcon(assets.rider, [45, 45])}
          zIndexOffset={100}
        >
          <Popup>Coursier</Popup>
        </Marker>
      </MapContainer>

      {/* HUD & Interface */}
      <div className="absolute top-6 left-6 right-6 md:w-96 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-xl pointer-events-auto border border-white/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                {isDelivery ? <Navigation size={24} /> : <Package size={24} />}
              </div>
              {!isConnected && (
                <WifiOff
                  size={16}
                  className="absolute -top-1 -right-1 text-red-500 bg-white rounded-full p-0.5"
                />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {isPickup
                  ? "En route vers le magasin"
                  : "En cours de livraison"}
              </p>
              <h3 className="font-black text-slate-800 text-lg">
                {etaSec ? `Arrivée dans ${formatETA(etaSec)}` : "Calcul..."}
              </h3>
            </div>
          </div>
        </div>

        {!isAutoPan && (
          <button
            onClick={() => setIsAutoPan(true)}
            className="mt-4 pointer-events-auto bg-white px-4 py-2 rounded-full shadow-lg text-xs font-bold text-green-600 flex items-center gap-2 animate-bounce"
          >
            <Navigation size={14} /> Recenter Rider
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackingMap;
