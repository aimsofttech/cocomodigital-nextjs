// @ts-nocheck
import React, { useState } from "react";
import SearchInput from "../../common/SearchInput/SearchInput";
import { GrFormDown } from "react-icons/gr";
import EditPencil from "../../common/EditPencil/EditPencil";
import { adminRoutes } from "../../../lib/adminEditRoutes";

const Category = ({
  categories,
  activeCategory,
  setActiveCategory,
  setSearchInput,
}) => {
  return (
    <header className="blog-header">
      <nav className="blog-navigation edit-host">
        <div
          style={{ marginRight: "10px" }}
          className={`blog-nav-link ${!activeCategory && "blog-category-active"
            }`}
          onClick={() => setActiveCategory("")}
        >
          All
        </div>
        {categories?.map((item, index) => (
          <NavItem
            key={index}
            title={item?.blog_category_name}
            items={item?.sub_categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        ))}
        <EditPencil
          to={adminRoutes.blog.categories()}
          label="the blog categories"
        />
      </nav>
      <SearchInput setSearchInput={setSearchInput} />
    </header>
  );
};

const NavItem = ({ title, items, activeCategory, setActiveCategory }) => {
  const [isOpen, setIsOpen] = useState(false);
  /* Phase 5l smoke fix: the API blog-categories may not include a
     sub_categories array (the field name differs in the new
     schema). Guard every access so SSR doesn't crash with
     `Cannot read properties of undefined (reading 'includes')`. */
  const safeItems = Array.isArray(items) ? items : [];
  const hasDropdown = safeItems.length > 0;
  const categoryListArray = safeItems.map((item) => item?.blog_sub_category_slug);

  return (
    <div
      className="blog-nav-item"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div
        className={`blog-nav-link ${categoryListArray.includes(activeCategory) && "blog-category-active"
          }`}
      >
        {title}
        {safeItems.length > 0 && (
          <span className={`blog-dropdown-icon ${isOpen ? "rotate" : " "}`}>
            <GrFormDown size={20} />
          </span>
        )}
      </div>
      {hasDropdown && isOpen && (
        <div className="blog-dropdown">
          <div className="blog-dropdown-content edit-host">
            {safeItems.map((item, index) => (
              <button
                key={index}
                className={`blog-dropdown-item ${activeCategory === item?.blog_sub_category_slug
                  ? "active"
                  : " "
                  }`}
                onClick={() => setActiveCategory(item?.blog_sub_category_slug)}
              >
                {item?.blog_sub_category_name}
              </button>
            ))}
              <EditPencil
                to={adminRoutes.blog.subCategories()}
                label="the blog sub-categories"
              />
          </div>
        </div>
      )}
    </div>
  );
};

export default Category;
