import { Charger } from "@/hooks/useChargers";
import { Zap, Star, MapPin } from "lucide-react";
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
      <div>
        <h3 className={`font-heading font-semibold ${compact ? "text-sm" : "text-base"}`}>{charger.title}</h3>
        <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
          <MapPin className="w-3 h-3" />
          {charger.address}
        </div>
      </div>
      <div className="flex items-center gap-1 text-secondary text-sm font-medium">
        <Star className="w-3.5 h-3.5 fill-secondary" />
        {charger.rating ?? "N/A"}
      </div>
    </div>

    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
      <span className="flex items-center gap-1">
        <Zap className="w-3.5 h-3.5 text-primary" />
        {charger.power} kW
      </span>
      <span>₹{charger.price_per_kwh}/kWh</span>
      <span className="text-xs">{charger.availability}</span>
    </div>

    {!compact && (
      <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onSelect?.(charger); }}>
        Book Now
      </Button>
    )}
  </div>
);

export default ChargerCard;
