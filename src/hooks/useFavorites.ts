import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("favorites")
        .select("charger_id")
        .eq("user_id", user.id);
      return (data ?? []).map((f) => f.charger_id);
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (chargerId: string) => {
      if (!user) throw new Error("Not signed in");
      const isFav = favoriteIds.includes(chargerId);
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("charger_id", chargerId);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, charger_id: chargerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });

  return { favoriteIds, toggleFavorite: toggleFavorite.mutate, isFavorite: (id: string) => favoriteIds.includes(id) };
}
