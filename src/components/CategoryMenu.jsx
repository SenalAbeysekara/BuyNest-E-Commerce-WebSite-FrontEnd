import React, { useEffect, useRef, useState } from "react";
import { Layers2 } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const categories = [
    "Fresh Fruits","Meat & Fish","Snacks","Fresh Vegetables",
    "Cooking Essentials","Milk & Diary","Health & Wellness","Beverages",
    "Household Needs","Personal Care","Spices & Masalas","Tea & Coffee",
    "Baby Care","Canned & Packaged Food","Frozen Foods","Pet Supplies",
];

function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}
function slugify(s) {
  return s.toLowerCase()
    .trim()
    .replace(/&/g, "-and-")      
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function GroceryMegaMenu() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const cols = chunkArray(categories, 4);
    const timerRef = useRef(null);

    useEffect(() => {
        function onDocClick(e) {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    function handleEnter() {
        if (timerRef.current) clearTimeout(timerRef.current);
        setOpen(true);
    }
    function handleLeave() {
        timerRef.current = setTimeout(() => setOpen(false), 150); 
    }

    return (
        <div
            ref={rootRef}
            className="relative"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Layers2 className="h-5 w-5" />
                Browse All Categories
            </button>

            {/* Panel */}
            {open && (
                <div
                    className="absolute left-0 top-full mt-2 w-[min(2000px,95vw)] rounded-2xl border border-gray-200 bg-white/90 shadow-xl z-50 font-poppins"
                    role="menu"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8">
                        {cols.map((col, i) => (
                            <div key={i} className="space-y-3">
                                {col.map((cat) => (
                                    <RouterLink
                                        key={cat}
                                        to={`/category/${slugify(cat)}`}
                                        className="block text-gray-700 hover:text-emerald-600 text-sm font-medium"
                                        onClick={() => setOpen(false)}
                                        role="menuitem"
                                    >
                                        {cat}
                                    </RouterLink>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
