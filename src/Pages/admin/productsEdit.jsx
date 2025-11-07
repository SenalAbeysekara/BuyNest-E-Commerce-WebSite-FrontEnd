import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import mediaUpload from "../../utils/mediaUpload";

export default function EditProductPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initial = useMemo(() => location.state || {}, [location.state]);

  const [productId]      = useState(initial.productId); 
  const [name, setName]  = useState(initial.name || "");
  const [category, setCategory] = useState((initial.categories && initial.categories[0]) || "");
  const [description, setDescription] = useState(initial.description || "");
  const [labelledPrice, setLabelledPrice] = useState(initial.labelledPrice ?? "");
  const [price, setPrice] = useState(initial.price ?? "");
  const [stock, setStock] = useState(initial.stock ?? "");
  const [files, setFiles] = useState([]); 
  const [previews, setPreviews] = useState(initial.images || []); 
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (typeof p === "string" && p.startsWith("blob:")) {
          URL.revokeObjectURL(p);
        }
      });
    };
  }, [previews]);

  function handleImageChange(e) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setFiles(picked);
    const created = picked.map((f) => URL.createObjectURL(f));
    setPreviews(created); 
  }

  function removeImage(idx) {
    const next = [...previews];
    const [removed] = next.splice(idx, 1);
    if (removed?.startsWith?.("blob:")) URL.revokeObjectURL(removed);
    setPreviews(next);
    if (files.length) {
      const nf = [...files];
      nf.splice(idx, 1);
      setFiles(nf);
    }
  }

  async function updateProduct(e) {
    e?.preventDefault?.();
    if (submitting) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    if (!name.trim() || !category) {
      toast.error("Please fill required fields");
      return;
    }
    
    try {
      setSubmitting(true);
      let imageUrls = initial.images || [];
      if (files.length > 0) {
        imageUrls = await Promise.all(files.map((f) => mediaUpload(f)));
      }

      const payload = {
        productId,
        name: name.trim(),
        categories: [category],
        description: description.trim(),
        images: imageUrls,
        labelledPrice: Number(labelledPrice) || 0,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
      };

      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/products/${productId}`, payload, {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      });

      toast.success("✅ Product updated successfully");
      navigate("/admin/products");
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to update product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
      <div className="w-full h-full overflow-y-auto py-6 px-3 md:px-6 font-[var(--font-main)]">
        {/* Page header */}
        <div className="mx-auto max-w-3xl mb-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-dgreen">Edit Product</h1>
          <p className="text-sm text-slate-500 mt-1">
            Update product details, pricing, categories, and images.
          </p>
        </div>

        {/* Card */}
        <form
            onSubmit={updateProduct}
            className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-4 md:p-6 space-y-5">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                  label="Product ID"
                  value={productId}
                  onChange={() => {}}
                  disabled
              />
              <Field
                  label="Product Name *"
                  placeholder="Enter product name"
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
                  placeholder="Select Category"
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
                Product Images
              </label>
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-center">
                <input
                    id="imageUpload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                />
                <label
                    htmlFor="imageUpload"
                    className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[.99]"
                >
                  Click to upload new images
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
                  Tip: Uploading new files will replace the existing images on save.
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
                  "Update Product"
              )}
            </button>
          </div>
        </form>
      </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", disabled = false }) {
  return (
      <div className="flex flex-col">
        <label className="mb-1 text-sm font-semibold text-slate-700">{label}</label>
        <input
            type={type}
            disabled={disabled}
            value={value}
            required
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                disabled ? "bg-slate-100 cursor-not-allowed" : ""
            }`}
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
            required
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
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
          {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
  );
}
