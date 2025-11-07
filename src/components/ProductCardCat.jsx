import React from "react";
import { Link } from "react-router-dom";
import { addToCart } from "../utils/cart.js";

export default function ProductCardCat({ product }) {
  const {
    _id,
    productId,
    name = "",
    price = 0,
    labelledPrice = 0,
    images = [],
    imageUrl: imageUrlProp,
    stock = 0,
  } = product ?? {};

  const derivedImage =
    imageUrlProp ??
    (
      (Array.isArray(images) && images.length > 0
        ? typeof images[0] === "string"
          ? images[0]
          : images[0]?.url || images[0]?.publicUrl
        : null) || "/images/placeholder.png"
    );

  const cleanPrice = Number(String(price).replace(/[^0-9.]/g, "")) || 0;
  const cleanLabelled =
    Number(String(labelledPrice).replace(/[^0-9.]/g, "")) || 0;

  const discount =
    cleanLabelled > 0 && cleanPrice > 0
      ? Math.round(((cleanLabelled - cleanPrice) / cleanLabelled) * 100)
      : null;

  const productKey = _id || productId;

  let stockLabel = null;
  if (stock === 0) {
    stockLabel = (
      <span className="bg-red-600 text-white text-[10px] px-2 py-[2px] rounded-md">
        Out of Stock
      </span>
    );
  } else if (stock < 10) {
    stockLabel = (
      <span className="bg-yellow-500 text-white text-[10px] px-2 py-[2px] rounded-md">
        Low Stock ({stock})
      </span>
    );
  }

  return (
    <div
      className="group relative bg-white border border-gray-200 rounded-xl shadow-sm 
      hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-in-out 
      flex flex-col items-center text-center p-4 font-poppins"
    >
      {/*Top badges */}
      {(discount || stockLabel) && (
        <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
          {discount && discount > 0 && (
            <span className="rounded-md bg-accent px-2 py-[2px] text-[10px] font-semibold text-white shadow-sm">
              {discount}% OFF
            </span>
          )}
          {stockLabel}
        </div>
      )}

      {/*Product Image*/}
      <Link
        to={`/product/${productKey}`}
        className="flex flex-col items-center w-full"
      >
        <div className="relative overflow-hidden rounded-lg mt-6 mb-3 w-full h-32 flex items-center justify-center">
          <img
            src={derivedImage}
            alt={name}
            loading="lazy"
            className="h-full object-contain transform transition-transform duration-300 ease-in-out group-hover:scale-110"
          />
        </div>

        <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-accent transition-colors duration-200">
          {name}
        </h3>
      </Link>

      {/* Price section */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-lg font-bold text-accent">
          LKR {cleanPrice.toFixed(2)}
        </span>
        {cleanLabelled > cleanPrice && (
          <span className="text-sm text-gray-400 line-through">
            LKR {cleanLabelled.toFixed(2)}
          </span>
        )}
      </div>

      {/*Add button */}
      <button
        onClick={() => addToCart(product, 1)}
        disabled={stock === 0}
        className={`mt-4 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium 
          transition-all duration-300 transform
          ${
            stock === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-accent text-white hover:bg-accent/90 hover:scale-105 shadow-md"
          }`}
      >
        {stock === 0 ? "Unavailable" : "Add to Cart"}
      </button>

      {/*Glow hover */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-accent/30 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
}
