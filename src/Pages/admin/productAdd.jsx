import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import mediaUpload from "../../utils/mediaUpload.jsx";

export default function AddProductPage() {
  const [productId, setProductId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState(""); 
  const [description, setDescription] = useState("");
  const [labelledPrice, setLabelledPrice] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [files, setFiles] = useState([]);       
  const [previews, setPreviews] = useState([]); 
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();


  const categoriesList = [
    "Fresh Fruits",
    "Meat & Fish",
    "Snacks",
    "Fresh Vegetables",
    "Cooking Essentials",
    "Milk & Diary",
    "Health & Wellness",
    "Beverages",
    "Household Needs",
    "Personal Care",
    "Spices & Masalas",
    "Tea & Coffee",
    "Baby Care",
    "Canned & Packaged Food",
    "Frozen Foods",
    "Pet Supplies",
    "Offers",
  ];

  // cleanup object URLs
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  function onPickImages(e) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const nextFiles = [...files, ...picked];
    setFiles(nextFiles);
    setPreviews((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(idx) {
    const nf = [...files];
    const np = [...previews];
    URL.revokeObjectURL(np[idx]);
    nf.splice(idx, 1);
    np.splice(idx, 1);
    setFiles(nf);
    setPreviews(np);
  }

  async function addProduct(e) {
    e?.preventDefault?.();
    if (submitting) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    if (!productId.trim()) return toast.error("Product ID is required");
    if (!name.trim()) return toast.error("Product Name is required");
    if (!category.trim()) return toast.error("Please select a category");
    if (!files.length) return toast.error("Please select at least one image");
    if (!price) return toast.error("Please enter the selling price");

    try {
      setSubmitting(true);

      // upload images
      const imageUrls = await Promise.all(files.map((f) => mediaUpload(f)));

      const payload = {
        productId: productId.trim(),
        name: name.trim(),
        categories: [category], 
        description: description.trim(),
        images: imageUrls,
        labelledPrice: Number(labelledPrice) || 0,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
      };

      await axios.post(import.meta.env.VITE_BACKEND_URL+"/api/products", payload, {
        headers: { Authorization: "Bearer " + token },
      });

      toast.success("✅ Product added successfully!");
      navigate("/admin/products");
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <div className="w-full h-full overflow-y-auto py-6 px-3 md:px-6 font-[var(--font-main)]">
        {/* Page header */}
        <div className="mx-auto max-w-3xl mb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dgreen">Add New Product</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter product details, pricing, category, and images.
          </p>
        </div>

        {/* Card */}
        <form
            onSubmit={addProduct} 
            className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-4 md:p-6 space-y-5">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                  label="Product ID *"
                  placeholder="001"
                  value={productId}
                  onChange={setProductId}
              />
              <Field
                  label="Product Name *"
                  placeholder="Coca Cola 1.5L"
                  value={name}
                  onChange={setName}
              />
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField
                  label="Category *"
                  value={category}
                  onChange={setCategory}
                  options={categoriesList}
                  placeholder="Select a category"
              />
              <NumberField
                  label="Original Price (LKR)"
                  placeholder="0.00"
                  value={labelledPrice}
                  onChange={setLabelledPrice}
                  step="0.01"
                  min={0}
              />
              <NumberField
                  label="Selling Price (LKR) *"
                  placeholder="0.00"
                  value={price}
                  onChange={setPrice}
                  step="0.01"
                  min={0}
              />
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberField
                  label="Stock *"
                  placeholder="0"
                  value={stock}
                  onChange={setStock}
                  min={0}
              />
              <div className="md:col-span-2">
                <TextareaField
                    label="Description"
                    rows={4}
                    placeholder="Short description about the product..."
                    value={description}
                    onChange={setDescription}
                />
              </div>
            </div>

            {/* Images */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold text-slate-700">
                Product Images *
              </label>
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-center">
                <input
                    id="imageUpload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={onPickImages}
                />
                <label
                    htmlFor="imageUpload"
                    className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[.99]"
                >
                  Click to upload images
                </label>

                {previews.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-4 justify-center">
                      {previews.map((src, i) => (
                          <div key={i} className="relative">
                            <img
                                src={src}
                                alt={`preview-${i}`}
                                className="h-28 w-28 rounded border object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs grid place-items-center"
                                title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                      ))}
                    </div>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  Tip: Add at least one clear product image (JPG/PNG).
                </p>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-4 md:px-6 md:py-5 rounded-b-2xl flex items-center justify-end gap-3">
            <Link
                to="/admin/products"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[.99]"
            >
              Cancel
            </Link>
            <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-dgreen px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dgreen/80 active:scale-[.99] disabled:opacity-60"
            >
              {submitting ? (
                  <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
                Saving...
              </span>
              ) : (
                  "Add Product"
              )}
            </button>
          </div>
        </form>
      </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
      <div className="flex flex-col">
        <label className="mb-1 text-sm font-semibold text-slate-700">{label}</label>
        <input
            type={type}
            value={value}
            required
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
  );
}

function NumberField({ label, value, onChange, placeholder, min, step }) {
  return (
      <div className="flex flex-col">
        <label className="mb-1 text-sm font-semibold text-slate-700">{label}</label>
        <input
            type="number"
            value={value}
            min={min}
            step={step}
            required
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 5 }) {
  return (
      <div className="flex flex-col">
        <label className="mb-1 text-sm font-semibold text-slate-700">{label}</label>
        <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
  );
}

function SelectField({ label, value, onChange, options = [], placeholder = "Select" }) {
  return (
      <div className="flex flex-col">
        <label className="mb-1 text-sm font-semibold text-slate-700">{label}</label>
        <select
            value={value}
            required
            onChange={(e) => onChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">{placeholder}</option>
          {options.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
          ))}
        </select>
      </div>
  );
}
