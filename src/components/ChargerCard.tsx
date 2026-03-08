import { Charger } from "@/hooks/useChargers";
import { Zap, Star, MapPin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  charger: Charger;
  compact?: boolean;
  onSelect?: (charger: Charger) => void;
}

const ChargerCard = ({ charger, compact, onSelect }: Props) => (
  <div
    className={`glass-light rounded-xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer ${compact ? "p-3" : "p-5"}`}
    onClick={() => onSelect?.(charger)}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {charger.source === "osm" ? (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Globe className="w-2.5 h-2.5" /> OSM
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30">
              <Zap className="w-2.5 h-2.5" /> VoltShare
            </span>
          )}
          <h3 className={`font-heading font-semibold truncate ${compact ? "text-sm" : "text-base"}`}>{charger.title}</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{charger.address}</span>
        </div>
      </div>
      {charger.rating != null && (
        <div className="flex items-center gap-1 text-secondary text-sm font-medium shrink-0 ml-2">
          <Star className="w-3.5 h-3.5 fill-secondary" />
          {charger.rating}
        </div>
      )}
    </div>

    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
      {charger.power > 0 && (
        <span className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-primary" />
          {charger.power} kW
        </span>
      )}
      {charger.source === "voltshare" && charger.price_per_kwh > 0 && (
        <span>₹{charger.price_per_kwh}/kWh</span>
      )}
      {charger.availability && <span className="text-xs">{charger.availability}</span>}
      {charger.operator && <span className="text-xs opacity-70">{charger.operator}</span>}
    </div>

    {!compact && charger.source === "voltshare" && (
      <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onSelect?.(charger); }}>
        Book Now
      </Button>
    )}
  </div>
);

export default ChargerCard;
