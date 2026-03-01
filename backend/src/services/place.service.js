// src/services/place.service.js
const Place = require("../models/place.model");

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

const normalizeCategory = (tags = {}) => {
  // Map đơn giản từ OSM tags -> enum của bạn
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const leisure = tags.leisure;
  const shop = tags.shop;

  if (amenity === "cafe") return "cafe";
  if (amenity === "restaurant" || amenity === "fast_food") return "restaurant";
  if (amenity === "bar" || amenity === "pub") return "bar";
  if (shop) return "shop";
  if (leisure === "park") return "park";
  if (tourism === "museum") return "museum";
  if (tourism === "hotel" || amenity === "hotel") return "hotel";

  return "other";
};

/**
 * Xây địa chỉ chi tiết: tên đường, phường, quận, thành phố, tỉnh
 * Format: [số] [đường], [phường/xã], [quận/huyện], [thành phố], [tỉnh]
 */
const buildAddressFromOSM = (tags = {}) => {
  const parts = [];
  // Số nhà + tên đường (gộp nếu có cả hai)
  const streetNum = tags["addr:housenumber"];
  const street = tags["addr:street"] || tags["addr:road"];
  if (streetNum && street) {
    parts.push(`${streetNum} ${street}`);
  } else if (street) {
    parts.push(street);
  } else if (streetNum) {
    parts.push(streetNum);
  }
  // Phường / xã / suburb
  const ward = tags["addr:suburb"] || tags["addr:ward"] || tags["addr:hamlet"];
  if (ward) parts.push(ward);
  // Quận / huyện
  const district = tags["addr:district"] || tags["addr:county"];
  if (district) parts.push(district);
  // Thành phố
  const city = tags["addr:city"] || tags["addr:town"];
  if (city) parts.push(city);
  // Tỉnh
  const state = tags["addr:state"] || tags["addr:province"];
  if (state) parts.push(state);
  // Quốc gia (chỉ thêm nếu không phải VN để tránh dư thừa)
  const country = tags["addr:country"];
  if (country && country !== "Vietnam" && country !== "Việt Nam") {
    parts.push(country);
  }
  return parts.filter(Boolean).join(", ") || tags.name || "";
};

const fetchJson = async (url, { method = "GET", headers = {}, body } = {}) => {
  const res = await fetch(url, {
    method,
    headers: {
      "User-Agent": "LACA-Platform/1.0 (places)",
      ...headers,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${text}`.trim());
  }
  return res.json();
};

// ------- OSM Reverse (Nominatim) -------
// Format địa chỉ: [số] [đường], [phường], [quận], [thành phố], [tỉnh]
const formatAddressFromNominatim = (addr = {}) => {
  const parts = [];
  const house = addr.house_number;
  const road = addr.road || addr.street;
  if (house && road) parts.push(`${house} ${road}`);
  else if (road) parts.push(road);
  else if (house) parts.push(house);
  if (addr.suburb) parts.push(addr.suburb);
  if (addr.city_district) parts.push(addr.city_district);
  if (addr.district) parts.push(addr.district);
  if (addr.city) parts.push(addr.city);
  if (addr.state) parts.push(addr.state);
  if (addr.country) parts.push(addr.country);
  return parts.filter(Boolean).join(", ");
};

exports.reverseGeocode = async ({ lat, lng }) => {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=jsonv2&lat=${encodeURIComponent(lat)}` +
      `&lon=${encodeURIComponent(lng)}&addressdetails=1`;

    const data = await fetchJson(url);
    const addr = data?.address || {};
    const name =
      data?.name ||
      addr.road ||
      addr.neighbourhood ||
      addr.suburb ||
      "Vị trí";
    const formattedAddr =
      formatAddressFromNominatim(addr) || data?.display_name || "";

    return {
      success: true,
      data: {
        name,
        address: formattedAddr,
        raw: data,
      },
    };
  } catch (e) {
    return {
      success: false,
      message: "Reverse geocode failed",
      error: e?.message,
      data: null,
    };
  }
};

// ------- Suggest: DB + Overpass -------
exports.suggestPlaces = async ({
  lat,
  lng,
  radius = 250,
  limit = 12,
  query = "",
}) => {
  radius = clamp(radius, 10, 5000);
  limit = clamp(limit, 1, 50);

  // 1) Suggest from DB (Place collection)
  const dbPlaces = await Place.find({
    isActive: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  })
    .limit(limit)
    .lean();

  const mappedDb = dbPlaces.map((p) => {
    const plLat = p.location?.coordinates?.[1];
    const plLng = p.location?.coordinates?.[0];
    return {
      source: "db",
      providerId: `db:${p._id}`,
      _id: p._id,
      name: p.name,
      address: p.address,
      category: p.category || "other",
      lat: plLat,
      lng: plLng,
      distanceMeters:
        Number.isFinite(plLat) && Number.isFinite(plLng)
          ? haversineMeters(lat, lng, plLat, plLng)
          : undefined,
    };
  });

  // 2) If still thiếu -> Overpass (OSM POIs quanh điểm)
  const need = Math.max(0, limit - mappedDb.length);
  let mappedOsm = [];

  if (need > 0) {
    try {
      // Overpass query: lấy node/way có name trong bán kính
      // NOTE: Overpass có thể chậm; radius nhỏ (250-1000m) thì ổn.
      const overpassQL = `
[out:json][timeout:25];
(
  node(around:${radius},${lat},${lng})["name"];
  way(around:${radius},${lat},${lng})["name"];
);
out center 30;
      `.trim();

      const osm = await fetchJson("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: overpassQL }),
      });

      const elements = Array.isArray(osm?.elements) ? osm.elements : [];

      mappedOsm = elements
        .map((el) => {
          const elLat = el.type === "node" ? el.lat : el.center?.lat;
          const elLng = el.type === "node" ? el.lon : el.center?.lon;
          if (!Number.isFinite(elLat) || !Number.isFinite(elLng)) return null;

          const name = el.tags?.name || "Unknown";
          const address = buildAddressFromOSM(el.tags);
          const category = normalizeCategory(el.tags);

          // filter query (optional)
          if (query) {
            const q = query.toLowerCase();
            const hay = `${name} ${address}`.toLowerCase();
            if (!hay.includes(q)) return null;
          }

          return {
            source: "osm",
            providerId: `osm:${el.type}/${el.id}`,
            name,
            address,
            category,
            lat: elLat,
            lng: elLng,
            distanceMeters: haversineMeters(lat, lng, elLat, elLng),
          };
        })
        .filter(Boolean)
        .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
        .slice(0, need);
    } catch {
      // bỏ qua OSM nếu fail, vẫn trả DB
      mappedOsm = [];
    }
  }

  const out = [...mappedDb, ...mappedOsm].slice(0, limit);
  return { success: true, count: out.length, data: out };
};

// ------- Resolve: trả Place _id cho FE -------
exports.resolvePlace = async ({
  lat,
  lng,
  name,
  address,
  category,
  googlePlaceId,
  forceCreate = false,
}) => {
  // validate coords
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      success: false,
      message: "Invalid latitude/longitude",
      data: null,
    };
  }

  category = (category || "other").trim();
  if (
    ![
      "cafe",
      "restaurant",
      "bar",
      "shop",
      "park",
      "museum",
      "hotel",
      "other",
    ].includes(category)
  ) {
    category = "other";
  }

  // 1) If googlePlaceId => upsert unique
  if (googlePlaceId) {
    const doc = await Place.findOneAndUpdate(
      { googlePlaceId },
      {
        $set: {
          googlePlaceId,
          name: name || "Place",
          address: address || "",
          category,
          location: { type: "Point", coordinates: [lng, lat] },
          isActive: true,
        },
      },
      { new: true, upsert: true },
    );
    return { success: true, data: doc };
  }

  // 2) Try find existing place near (<= 30m) to avoid duplicates — BỎ QUA nếu forceCreate (user chủ động tạo vị trí mới)
  if (!forceCreate) {
    const near = await Place.findOne({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 30,
        },
      },
      isActive: true,
    }).lean();

    if (near) {
      return { success: true, data: near };
    }
  }

  // 3) If missing name/address -> try reverse
  let finalName = name;
  let finalAddress = address;

  if (!finalName || !finalAddress) {
    const rev = await exports.reverseGeocode({ lat, lng });
    if (rev?.success && rev?.data) {
      finalName = finalName || rev.data.name || "Vị trí";
      finalAddress = finalAddress || rev.data.address || "";
    }
  }

  // 4) Still missing => reject (để bạn bắt user nhập)
  if (!finalName || !finalAddress) {
    return {
      success: false,
      message:
        "Missing name/address. Please provide or enable reverse geocode.",
      data: null,
    };
  }

  const created = await Place.create({
    googlePlaceId: undefined,
    name: finalName,
    address: finalAddress,
    category,
    location: { type: "Point", coordinates: [lng, lat] },
    isActive: true,
  });

  return { success: true, data: created };
};
