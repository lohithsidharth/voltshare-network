import { Charger } from "@/hooks/useChargers";
import { Star, MapPin, Heart, Zap, Plug } from "lucide-react";
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

const statusConfig: Record<AvailStatus, { label: string; dotColor: string; textColor: string }> = {
  available: { label: "Available", dotColor: "bg-primary", textColor: "text-primary" },
  occupied: { label: "Busy", dotColor: "bg-destructive", textColor: "text-destructive" },
  unknown: { label: "Unknown", dotColor: "bg-muted-foreground", textColor: "text-muted-foreground" },
};

const ChargerCard = ({ charger, compact, onSelect, recommended }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const status = getStatus(charger);
  const sc = statusConfig[status];
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
        "rounded-xl border border-border/50 bg-card/50 cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        recommended && "border-primary/40 ring-1 ring-primary/20",
        compact ? "p-3" : "p-4"
      )}
      onClick={() => onSelect?.(charger)}
    >
      {recommended && (
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary">Best Match</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-heading font-bold truncate", compact ? "text-sm" : "text-base")}>
            {charger.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {charger.address}
          </p>
        </div>

        {charger.source === "voltshare" && user && (
          <button onClick={handleFavorite} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors shrink-0">
            <Heart className={cn("w-4 h-4", isFav ? "text-destructive fill-destructive" : "text-muted-foreground")} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", sc.textColor)}>
          <div className={cn("w-1.5 h-1.5 rounded-full", sc.dotColor)} />
          {sc.label}
        </div>
        {charger.power > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Plug className="w-3 h-3" />{charger.power} kW
          </span>
        )}
        {charger.source === "voltshare" && charger.price_per_kwh > 0 && (
          <span className="text-xs text-muted-foreground">₹{charger.price_per_kwh}/kWh</span>
        )}
        {charger.rating != null && charger.rating > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-primary text-primary" />
            {charger.rating}
          </span>
        )}
        <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
          {charger.source === "voltshare" ? "VoltShare" : "OpenStreetMap"}
        </span>
      </div>

      {!compact && charger.source === "voltshare" && (
        <Button size="sm" className="w-full mt-3 h-9 rounded-lg font-medium text-sm" onClick={handleBookNow}>
          Book Now
        </Button>
      )}
    </div>
  );
};

export default ChargerCard;
