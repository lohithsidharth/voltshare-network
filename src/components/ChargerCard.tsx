import { Charger } from "@/hooks/useChargers";
import { Zap, Star, MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  charger: Charger;
  compact?: boolean;
  onSelect?: (charger: Charger) => void;
  recommended?: boolean;
}

type AvailStatus = "available" | "occupied" | "unknown";

function getStatus(charger: Charger): AvailStatus {
  if (charger.source === "osm") return "unknown";
  const avail = (charger.availability || "").toLowerCase();
  if (avail === "occupied" || avail === "offline" || avail === "unavailable") return "occupied";
  if (avail === "available" || avail === "open" || charger.is_active) return "available";
  return "unknown";
}

const statusLabel: Record<AvailStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "text-secondary" },
  occupied: { label: "Busy", color: "text-destructive" },
  unknown: { label: "Unknown", color: "text-muted-foreground" },
};

const ChargerCard = ({ charger, compact, onSelect, recommended }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const status = getStatus(charger);
  const sl = statusLabel[status];
  const isFav = charger.source === "voltshare" && isFavorite(charger.id);

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (charger.source === "voltshare") navigate(`/charger/${charger.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(charger.id);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 cursor-pointer transition-colors hover:border-muted-foreground/30",
        recommended && "border-primary/40"
      )}
      onClick={() => onSelect?.(charger)}
    >
      {recommended && (
        <p className="text-xs text-primary font-medium mb-2">⚡ Recommended</p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-heading font-semibold truncate", compact ? "text-sm" : "text-base")}>
            {charger.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {charger.address}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {charger.source === "voltshare" && user && (
            <button onClick={handleFavorite} className="p-1">
              <Heart className={cn("w-4 h-4", isFav ? "text-destructive fill-destructive" : "text-muted-foreground")} />
            </button>
          )}
          {charger.rating != null && charger.rating > 0 && (
            <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
              <Star className="w-3 h-3 fill-secondary text-secondary" />
              {charger.rating}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
        <span className={cn("font-medium", sl.color)}>{sl.label}</span>
        {charger.power > 0 && <span>{charger.power} kW</span>}
        {charger.source === "voltshare" && charger.price_per_kwh > 0 && (
          <span>₹{charger.price_per_kwh}/kWh</span>
        )}
        <span className="text-[10px] uppercase tracking-wide">
          {charger.source === "voltshare" ? "VoltShare" : "OSM"}
        </span>
      </div>

      {!compact && charger.source === "voltshare" && (
        <Button size="sm" className="w-full mt-3 h-8 text-xs rounded-md" onClick={handleBookNow}>
          Book Now
        </Button>
      )}
    </div>
  );
};

export default ChargerCard;
