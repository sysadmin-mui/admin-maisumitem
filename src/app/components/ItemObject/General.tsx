import { ItemCatalogDetailProps } from "@/types/item";
import React from "react";

const General = ({ item }: ItemCatalogDetailProps) => {
  return (
    <div className="bg-gray-200 rounded-lg p-4 w-full">
      <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
        <strong>{item?.info1 === item?.info3 ? "Seleção: " : "Time: "} </strong>
        {item.info1}
      </p>
      <p className="text-sm text-[#C4C4C4] mt-2">
        Adicionado em{" "}
        {new Intl.DateTimeFormat("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(item.created_at))}
      </p>
    </div>
  );
};

export default General;
