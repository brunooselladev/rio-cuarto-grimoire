import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input.jsx";
import { MapPin } from "lucide-react";

export default function GooglePlacesInput({ value, onSelect, placeholder = "Buscar dirección..." }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_GOOGLE;

    if (!window.google?.maps) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es`;
      script.async = true;
      script.defer = true;
      script.onload = initService;
      document.head.appendChild(script);
    } else {
      initService();
    }

    function initService() {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      map.current = document.createElement("div");
      placesService.current = new window.google.maps.places.PlacesService(map.current);
    }
  }, []);

  const handleChange = (e) => {
    const input = e.target.value;
    setQuery(input);

    if (!autocompleteService.current || !input) {
      setSuggestions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      { input, componentRestrictions: { country: "ar" } },
      (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          setSuggestions([]);
          return;
        }
        setSuggestions(predictions);
      }
    );
  };

  const handleSelect = (placeId, description) => {
    placesService.current.getDetails({ placeId, fields: ["geometry", "formatted_address"] }, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        onSelect({ address: description, lat, lng });
        setQuery(description);
        setSuggestions([]);
      }
    });
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="font-mono pl-10"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 bg-black border border-gray-700 mt-1 w-full rounded-lg text-sm">
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onClick={() => handleSelect(s.place_id, s.description)}
              className="cursor-pointer hover:bg-gray-800 px-3 py-2"
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
