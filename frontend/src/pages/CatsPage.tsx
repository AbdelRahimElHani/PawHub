import { useEffect } from "react";
import { CatGallery } from "../cats/gallery/CatGallery";
import { useCatSanctuaryStore } from "../cats/useCatSanctuaryStore";
import "../cats/cats.css";

export function CatsPage() {
  const fetchCats = useCatSanctuaryStore((s) => s.fetchCats);

  useEffect(() => {
    void fetchCats();
  }, [fetchCats]);

  return (
    <div className="cats-sanctuary">
      <CatGallery />
    </div>
  );
}
