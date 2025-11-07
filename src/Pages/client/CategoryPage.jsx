import { useEffect, useState } from "react";
import ProductCardCat from "../../components/ProductCardCat.jsx";
import { motion } from "framer-motion";
import axios from "axios";

function capitalizeWords(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

const categories = [
  "All",
  "Fresh Fruits", "Meat & Fish", "Snacks", "Fresh Vegetables",
  "Cooking Essentials", "Milk & Diary", "Health & Wellness", "Beverages",
  "Household Needs", "Personal Care", "Spices & Masalas", "Tea & Coffee",
  "Baby Care", "Canned & Packaged Food", "Frozen Foods", "Pet Supplies", "Offers"
];

export default function CategoryPage({ category }) {
  const [allProducts, setAllProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(category || "All");
  const [stockFilter, setStockFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("");
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    const base = import.meta.env.VITE_BACKEND_URL;

    const request = selectedCategory === "All"
      ? axios.get(`${base}/api/products`)
      : axios.post(`${base}/api/products/category`, { category: selectedCategory });

    request
      .then((res) => setAllProducts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err));
  }, [selectedCategory]);

  useEffect(() => {
    if (category) setSelectedCategory(category);
  }, [category]);

  // apply filters client-side 
  useEffect(() => {
    let result = [...allProducts];

    if (selectedCategory !== "All") {
      result = result.filter((p) =>
        (p.categories || []).some(
          (c) => c.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
        )
      );
    }

    if (stockFilter === "Low Stock")
      result = result.filter((p) => p.stock > 0 && p.stock < 10);
    else if (stockFilter === "Out of Stock")
      result = result.filter((p) => p.stock === 0);
    else if (stockFilter === "In Stock")
      result = result.filter((p) => p.stock >= 10);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.productId && p.productId.toLowerCase().includes(q))
      );
    }

    result = result.filter(
      (p) =>
        typeof p.price === "number" &&
        p.price >= priceRange[0] &&
        p.price <= priceRange[1]
    );

    if (sort === "low-high") result.sort((a, b) => a.price - b.price);
    else if (sort === "high-low") result.sort((a, b) => b.price - a.price);

    setFiltered(result);
    setPage(1);
  }, [allProducts, selectedCategory, stockFilter, searchQuery, priceRange, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedProducts = filtered.slice((page - 1) * pageSize, page * pageSize);

  function clearFilters() {
    setSelectedCategory("All");
    setStockFilter("All");
    setSearchQuery("");
    setSort("");
    setPriceRange([0, 5000]);
    setPage(1);
  }

  return (
    <main className="container mx-auto px-4 md:px-6 py-8 font-poppins">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* FilterBar*/}
        <motion.aside
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-6 md:sticky md:top-4 md:h-fit"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-red-500 hover:underline"
            >
              Clear All
            </button>
          </div>

          {/* Categories list */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {categories.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-sm text-left px-3 py-2 rounded-lg border ${
                    selectedCategory === cat
                      ? "bg-dgreen text-white border-dgreen"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stock filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Stock</h4>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="All">All</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Price slider */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Price</h4>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([0, Number(e.target.value)])}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              LKR {priceRange[0]} – {priceRange[1]}
            </p>
          </div>

          {/* Sort */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Sort By</h4>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Default</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
            </select>
          </div>
        </motion.aside>

        {/*PRODUCTS*/}
        <motion.section
          className="md:col-span-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <h2 className="text-lg text-gray-600">
              Showing{" "}
              <span className="font-semibold">{pagedProducts.length}</span>{" "}
              from{" "}
              <span className="font-semibold">{filtered.length}</span>{" "}
              {selectedCategory === "All"
                ? "total products"
                : `in ${capitalizeWords(selectedCategory)}`}
            </h2>

            {/* Search bar */}
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-1 w-full md:w-1/3">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow outline-none text-sm px-1"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-red-500 text-sm ml-2"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Product grid */}
          {pagedProducts.length > 0 ? (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {pagedProducts.map((p) => (
                <ProductCardCat key={p._id || p.productId} product={p} />
              ))}
            </motion.div>
          ) : (
            <p className="text-gray-600">No products found.</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 space-x-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
}
