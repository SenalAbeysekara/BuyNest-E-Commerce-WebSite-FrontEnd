import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { addToCart } from "../../utils/cart.js";

export default function ProductOverview({ apiBase = import.meta.env.VITE_BACKEND_URL }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    async function fetchProduct() {
      setState({ loading: true, error: null });
      try {
        const res = await axios.get(`${apiBase}/api/products/${id}`);
        setProduct(res.data);
        setActiveIndex(0);
        setState({ loading: false, error: null });
      } catch (err) {
        setState({
          loading: false,
          error: err?.response?.data?.message || err?.message || "Failed to fetch",
        });
      }
    }

    fetchProduct();
  }, [id, apiBase]);

  if (state.loading) return <p className="p-8">Loading product...</p>;
  if (state.error) return <p className="p-8 text-red-600">Error: {state.error}</p>;
  if (!product) return <p className="p-8 text-gray-600">Product not found</p>;

  const {
    productId, 
    name,
    price,
    labelledPrice,
    description,
    images = [],
    imageUrl,
    categories,
  } = product;

  const category = Array.isArray(categories) ? categories[0] : categories;

  const cleanPrice = Number(String(price).replace(/[^0-9.]/g, "")) || 0;
  const cleanLabelled = Number(String(labelledPrice).replace(/[^0-9.]/g, "")) || 0;

  //all images
  const allImages = [
    ...(Array.isArray(images)
      ? images.map((img) => (typeof img === "string" ? img : img?.url || img?.publicUrl))
      : []),
    ...(imageUrl ? [imageUrl] : []),
  ].filter(Boolean);

  const nextImage = () => setActiveIndex((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setActiveIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));

  return (
    <main className="container mx-auto px-6 py-10 font-poppins">
      {/*Breadcrumb */}
      <nav className="text-sm mb-6 flex items-center space-x-2">
        <Link to="/" className="text-accent font-medium hover:underline">Home</Link>

        {category && (
          <>
            <span className="text-gray-400">›</span>
            <Link
              to={`/category/${category.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-accent font-medium hover:underline"
            >
              {category}
            </Link>
          </>
        )}

        <span className="text-gray-400">›</span>
        <span className="text-gray-700">{name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/*image with prev/next */}
        <div className="flex flex-col items-center">
          <div className="relative w-full border rounded-lg p-4 bg-white shadow-md flex justify-center">
            {allImages.length > 0 ? (
              <img
                src={allImages[activeIndex]}
                alt={`${name}-${activeIndex}`}
                className="max-h-[320px] object-contain rounded-md"
              />
            ) : (
              <img
                src="/images/placeholder.png"
                alt="placeholder"
                className="max-h-[450px] object-contain rounded-md"
              />
            )}

            {/* Prev/Next */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white hover:bg-emerald-50 rounded-full p-2 shadow"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white hover:bg-emerald-50 rounded-full p-2 shadow"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              </>
            )}
          </div>

          {/*Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`border rounded-md p-1 transition ${
                    activeIndex === i ? "border-accent ring-2 ring-accent/80" : "border-gray-300"
                  }`}
                >
                  <img src={img} alt={`thumb-${i}`} className="w-20 h-20 object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/*product info */}
        <div className="flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>

            {productId && (
              <p className="text-sm text-gray-500 mb-4">
                Product ID: {productId}
              </p>
            )}

            {/*Price Section */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-emerald-600 text-2xl font-bold">
                Rs {cleanPrice.toFixed(2)}
              </span>
              {cleanLabelled > 0 && cleanLabelled > cleanPrice && (
                <span className="text-gray-400 line-through text-lg">
                  Rs {cleanLabelled.toFixed(2)}
                </span>
              )}
            </div>

            {/*Description */}
            <p className="text-gray-700 mb-6 leading-relaxed text-lg">
              {description || "No description available."}
            </p>

            <button
              onClick={() => addToCart(product, 1)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg shadow-md text-lg font-medium transition"
            >
              Add to Cart
            </button>
          </div>

          <div className="mt-10 border-t pt-6 text-sm text-gray-600 space-y-2">
            <p>✓ Free Delivery over Rs 20,000</p>
            <p>✓ 7-day return policy</p>
            <p>✓ Secure payment guaranteed</p>
          </div>
        </div>
      </div>
    </main>
  );
}
