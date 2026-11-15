'use client';

export default function SortSelect({ value }) {
  return (
    <select name="sort" defaultValue={value} onChange={(e) => e.target.form.requestSubmit()} className="input !w-auto !rounded-full !py-2" aria-label="Sort products">
      <option value="featured">Featured</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
      <option value="rating">Top rated</option>
    </select>
  );
}
