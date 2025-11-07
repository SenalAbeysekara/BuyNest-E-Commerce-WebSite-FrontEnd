import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FiPieChart, FiBell, FiCheckCircle } from "react-icons/fi";
import axios from "axios";
import toast from "react-hot-toast";

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-emerald-700">
      <div className="animate-spin h-12 w-12 border-4 border-emerald-400 border-t-transparent rounded-full mb-4"></div>
      <p className="text-lg font-semibold">Loading products...</p>
    </div>
  );
}

export default function ProductPage() {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sending, setSending] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    if (isLoading) {
        axios
            .get(import.meta.env.VITE_BACKEND_URL + "/api/products")
            .then((res) => {
                const updated = res.data
                    .map((p) => ({ ...p, notified: false }))
                    .sort((a, b) => b.productId.localeCompare(a.productId));

                setProducts(updated);
                setAllProducts(updated);
                setIsLoading(false);
            })

            .catch(() => {
          toast.error("Failed to load products");
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  //Delete product
  function deleteProduct(productId) {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }
    axios
      .delete(import.meta.env.VITE_BACKEND_URL + "/api/products/" + productId, {
        headers: { Authorization: "Bearer " + token },
      })
      .then(() => {
        toast.success("Product deleted successfully");
        setIsLoading(true);
      })
      .catch((e) => {
        toast.error(e.response?.data?.message || "Failed to delete product");
      });
  }

  //Notify supplier
  function notifySupplier(productId) {
    setSending(true);
    axios
      .post(import.meta.env.VITE_BACKEND_URL + "/api/products/notify", {
        productId,
      })
      .then(() => {
        setSending(false);
        setShowConfirm(false);
        setAllProducts((prev) =>
          prev.map((p) =>
            p.productId === productId ? { ...p, notified: true } : p
          )
        );
        toast.success("Supplier notified!");
      })
      .catch((err) => {
        setSending(false);
        toast.error(err.response?.data?.message || "Failed to notify supplier");
      });
  }

  const categories = [
    "All",
    ...new Set(allProducts.flatMap((p) => p.categories || [])),
  ];

  const filteredProducts = allProducts.filter((p) => {
    const categoryMatch =
      selectedCategory === "All" ||
      p.categories?.some(
        (c) =>
          c.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
      );

    let stockMatch = true;
    if (stockFilter === "Low Stock") stockMatch = p.stock > 0 && p.stock < 10;
    else if (stockFilter === "Out of Stock") stockMatch = p.stock === 0;
    else if (stockFilter === "In Stock") stockMatch = p.stock >= 10;

    const searchMatch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productId.toLowerCase().includes(searchQuery.toLowerCase());

    return categoryMatch && stockMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + pageSize
  );
  
  //KPIs
  const totalCount = allProducts.length;
  const inStockCount = allProducts.filter((p) => p.stock >= 10).length;
  const lowStockCount = allProducts.filter(
    (p) => p.stock > 0 && p.stock < 10
  ).length;
  const outOfStockCount = allProducts.filter((p) => p.stock === 0).length;

  const notifications = allProducts
    .filter((p) => p.stock === 0 || (p.stock > 0 && p.stock < 10))
    .map((p) => ({
      id: p.productId,
      name: p.name,
      image: p.images?.[0],
      type: p.stock === 0 ? "out" : "low",
      stock: p.stock,
      message:
        p.stock === 0
          ? `${p.name} is OUT OF STOCK!`
          : `${p.name} is LOW on stock (${p.stock} left)`,
      notified: p.notified || false,
    }));

  function formatLKR(value) {
    return `LKR ${Number(value).toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (isLoading) {
    return (
      <div className="w-full h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full max-h-full overflow-y-auto p-4 md:p-6">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-dgreen">
            Product Inventory
          </h1>
          <p className="text-gray-500 text-sm">
            Manage your product details, categories, pricing, and stock
            information.
          </p>
        </div>

        {/*Notification Bell */}
        <div className="relative z-50">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 rounded-full bg-white border border-slate-200 shadow hover:bg-slate-100"
          >
            <FiBell className="text-xl text-slate-700" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
              <div className="p-3 border-b border-slate-100 font-semibold text-slate-700">
                Notifications
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => {
                        if (!n.notified) {
                          setSelectedProduct(n);
                          setShowConfirm(true);
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-2 text-sm cursor-pointer ${
                        n.notified ? "bg-green-50" : "hover:bg-slate-50"
                      }`}
                    >
                      {n.image ? (
                        <img
                          src={n.image}
                          alt={n.name}
                          className="w-10 h-10 object-cover rounded-full border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs">
                          N/A
                        </div>
                      )}
                      <div className="flex flex-col flex-1">
                        <span className="text-xs text-slate-500">
                          ID: {n.id}
                        </span>
                        <span
                          className={`font-medium ${
                            n.type === "out"
                              ? "text-red-600"
                              : "text-yellow-700"
                          }`}
                        >
                          {n.message}
                        </span>
                      </div>

                      {n.notified && (
                        <FiCheckCircle className="text-green-600 text-lg ml-auto" />
                      )}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-sm text-slate-500">
                    No alerts 🎉
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/*Confirmation Modal */}
      {showConfirm && selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 sm:w-96">
            <h2 className="text-lg font-bold mb-3 text-slate-800">
              Confirm Supplier Notification
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Notify supplier to resupply <b>{selectedProduct.name}</b> (ID:{" "}
              {selectedProduct.id})?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => notifySupplier(selectedProduct.id)}
                disabled={sending}
                className={`px-4 py-2 rounded-lg text-white ${
                  sending
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-dgreen hover:bg-dgreen/90"
                }`}
              >
                {sending ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm">Total Products</p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm">In Stock</p>
          <p className="text-2xl font-bold text-green-600">{inStockCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2"
          >
            {categories.map((cat, i) => (
              <option key={i} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2"
          >
            <option value="All">All Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="In Stock">In Stock</option>
          </select>

          {/* Search */}
          <div className="flex items-center border border-slate-300 rounded px-2 py-1">
            <input
              type="text"
              placeholder="Search by name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow outline-none px-2 py-1 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-500 hover:text-red-600 px-2"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <Link
          to="/admin/add-product"
          className="bg-dgreen hover:bg-dgreen/80 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition"
        >
          + Add Product
        </Link>
      </div>

      {/*Responsive Table Wrapper */}
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-[800px] w-full text-sm md:text-base">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-left min-w-[110px]">
                Product ID
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-left min-w-[160px]">
                Name
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-center min-w-[80px]">
                Image
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-left min-w-[180px]">
                Categories
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-left min-w-[140px]">
                Original Price
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-left min-w-[140px]">
                Selling Price
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-left min-w-[120px]">
                Stock
              </th>
              <th className="py-3 px-4 text-xs font-semibold uppercase text-center min-w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {currentProducts.length > 0 ? (
              currentProducts.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50 transition duration-200 text-sm"
                >
                  <td className="py-3 px-4 font-medium text-slate-700 text-sm">
                    {item.productId}
                  </td>
                  <td className="py-3 px-4 text-sm">{item.name}</td>
                  <td className="py-3 px-4 text-center">
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-full shadow-sm"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm">
                    {item.categories?.join(", ")}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {formatLKR(item.labelledPrice)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {formatLKR(item.price)}
                  </td>
                  <td className="py-3 px-4">
                    {item.stock === 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        Out of Stock
                      </span>
                    ) : item.stock < 10 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        Low ({item.stock})
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        {item.stock}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() =>
                          navigate("/admin/edit-product", { state: item })
                        }
                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition"
                      >
                        <FaEdit size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(item.productId)}
                        className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="8"
                  className="py-6 text-slate-500 text-center whitespace-nowrap"
                >
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 bg-slate-50 flex-wrap gap-2 mt-4 rounded-xl">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={`px-4 py-2 rounded-lg ${
              currentPage === 1
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-dgreen text-white hover:bg-dgreen/90"
            }`}
          >
            Previous
          </button>
          <p className="text-slate-600 text-sm">
            Page {currentPage} of {totalPages}
          </p>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={`px-4 py-2 rounded-lg ${
              currentPage === totalPages
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-dgreen text-white hover:bg-dgreen/90"
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Report Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => navigate("/admin/product-analysis")}
          className="flex items-center gap-2 rounded-lg px-5 py-3 font-semibold shadow-sm
                     bg-dgreen text-white hover:bg-dgreen/90 active:scale-[0.98] transition"
        >
          <FiPieChart className="text-xl" />
          Create Report
        </button>
      </div>
    </div>
  );
}
