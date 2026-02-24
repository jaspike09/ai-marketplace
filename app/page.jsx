"use client";
import { useState } from "react";

export default function MarketplaceHome() {
// Placeholder inventory showing the masonry layout effect
const [items] = useState([
{ id: 1, title: "Whirlpool Front Load Washer (Refurbished)", price: "$250", location: "Midwest City, OK", height: "h-64", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=500&q=80" },
{ id: 2, title: "Custom Crossbow Project", price: "$120", location: "Tulsa, OK", height: "h-80", image: "https://images.unsplash.com/photo-1590401826500-410e300224ce?auto=format&fit=crop&w=500&q=80" },
{ id: 3, title: "Harley-Davidson Clutch Cable (New)", price: "$45", location: "Midwest City, OK", height: "h-56", image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=500&q=80" },
{ id: 4, title: "Samsung Dryer Rear Bearing Kit", price: "$30", location: "Oklahoma City, OK", height: "h-72", image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=500&q=80" },
{ id: 5, title: "Ibanez Electric Guitar", price: "$300", location: "Midwest City, OK", height: "h-80", image: "https://images.unsplash.com/photo-1514649923863-ceaf75b770ab?auto=format&fit=crop&w=500&q=80" },
{ id: 6, title: "Gaming PC Setup", price: "$800", location: "Tulsa, OK", height: "h-64", image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=80" },
]);

return (
<main className="min-h-screen bg-slate-50 pb-24">

  {/* Top Navbar */}
  <nav className="bg-white px-4 py-4 sticky top-0 z-40 shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center">
        <span className="text-white font-black text-xl leading-none">A</span>
      </div>
      <span className="font-black text-xl tracking-tight text-slate-900">marketplace</span>
    </div>
    
    <div className="flex items-center gap-4">
      <button className="text-slate-500 font-semibold text-sm hover:text-slate-900 transition-colors">
        Midwest City, OK ▾
      </button>
      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
    </div>
  </nav>

  {/* Categories Bar */}
  <div className="flex overflow-x-auto hide-scrollbar gap-3 px-4 py-4 bg-white border-b border-slate-100">
    {['All', 'Appliances', 'Vehicles', 'Electronics', 'Furniture', 'Tools', 'Free'].map((cat) => (
      <button key={cat} className="px-5 py-2 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm whitespace-nowrap hover:bg-rose-500 hover:text-white transition-colors">
        {cat}
      </button>
    ))}
  </div>

  {/* Masonry Grid */}
  <div className="p-4 max-w-7xl mx-auto">
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {items.map((item) => (
        <div key={item.id} className="relative group rounded-2xl overflow-hidden cursor-pointer break-inside-avoid shadow-sm hover:shadow-xl transition-all duration-300">
          {/* Image */}
          <div className={`w-full ${item.height} bg-slate-200`}>
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
          
          {/* Price & Title (Letgo Style) */}
          <div className="absolute bottom-0 left-0 p-4 w-full">
            <div className="font-black text-2xl text-white mb-1 tracking-tight drop-shadow-md">{item.price}</div>
            <div className="text-slate-200 text-sm font-medium line-clamp-1 drop-shadow-md">{item.title}</div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* The Floating Letgo "Sell" Button */}
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
    <button className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-3 px-8 py-4 rounded-full shadow-[0_10px_30px_rgba(244,63,94,0.4)] transition-transform hover:scale-105 active:scale-95">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      <span className="font-bold text-lg tracking-wide uppercase">Post Item</span>
    </button>
  </div>

</main>
); }