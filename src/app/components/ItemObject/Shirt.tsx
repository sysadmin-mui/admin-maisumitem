import { ItemCatalogDetailProps } from "@/types/item";
import React from "react";

const Shirt = ({ item }: ItemCatalogDetailProps) => {
  function setModel(data: string) {
    switch (data) {
      case "titular":
        return "Titular";
      case "reserva":
        return "Reserva";
      case "terceira":
        return "3ª camisa";
      case "quarta":
        return "4ª camisa";
      case "treino":
        return "Treino";
      case "prejogo":
        return "Pré-Jogo";
      case "goleiro":
        return "Goleiro";
      case "comemorativa":
        return "Comemorativa";
      default:
        return null;
    }
  }

  return (
    <div className="bg-gray-200 rounded-lg p-4 w-full">
      <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
        <strong>{item?.info1 === item?.info3 ? "Seleção: " : "Time: "} </strong>
        {item.info1}
      </p>
      <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
        <strong>Ano: </strong>
        {item.year2 ? `${item.year}/${item.year2}` : item.year}
      </p>
      <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
        <strong>Marca: </strong>
        {item.info2}
      </p>
      <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
        <strong>Modelo: </strong>
        {setModel(item.info4)}
      </p>
      {item?.info1 === item?.info4 ? null : (
        <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
          <strong>País: </strong>
          {item.info3}
        </p>
      )}
      <p className="text-base md:text-lg text-gray-800 whitespace-pre-line mb-2">
        <strong>Esporte: </strong>
        {item.info5}
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

export default Shirt;
