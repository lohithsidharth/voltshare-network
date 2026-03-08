import { Charger } from "@/hooks/useChargers";
import { Star, MapPin, Heart } from "lucide-react";
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

const statusMap: Record<AvailStatus, { label: string; color: string }> = {
  available: { label: "ONLINE", color: "text-primary" },
  occupied: { label: "BUSY", color: "text-destructive" },
  unknown: { label: "UNKNOWN", color: "text-muted-foreground" },
};

const ChargerCard = ({ charger, compact, onSelect, recommended }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const status = getStatus(charger);
  const sl = statusMap[status];
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
        "border border-border bg-card cursor-pointer transition-colors hover:border-muted-foreground/40",
        recommended && "border-primary/50",
        compact ? "p-3" : "p-4"
      )}
      onClick={() => onSelect?.(charger)}
    >
      {recommended && (
        <p className="font-mono text-[10px] tracking-wider text-primary mb-2">▸ RECOMMENDED</p>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-heading font-semibold truncate", compact ? "text-sm" : "text-base")}>
            {charger.title}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {charger.address}
          </p>
        </div>

        {charger.source === "voltshare" && user && (
          <button onClick={handleFavorite} className="p-0.5 shrink-0">
            <Heart className={cn("w-3.5 h-3.5", isFav ? "text-destructive fill-destructive" : "text-muted-foreground")} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2.5 font-mono text-[10px] tracking-wider text-muted-foreground">
        <span className={cn("font-semibold", sl.color)}>{sl.label}</span>
        {charger.power > 0 && <span>{charger.power}KW</span>}
        {charger.source === "voltshare" && charger.price_per_kwh > 0 && (
          <span>₹{charger.price_per_kwh}/KWH</span>
        )}
        {charger.rating != null && charger.rating > 0 && (
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-primary text-primary" />
            {charger.rating}
          </span>
        )}
        <span className="ml-auto">{charger.source === "voltshare" ? "VS" : "OSM"}</span>
      </div>

      {!compact && charger.source === "voltshare" && (
        <Button size="sm" className="w-full mt-3 h-7 text-[10px] font-mono tracking-wider rounded-sm" onClick={handleBookNow}>
          BOOK NOW
        </Button>
      )}
    </div>
  );
};

export default ChargerCard;
