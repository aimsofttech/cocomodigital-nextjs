// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { GrDown } from "react-icons/gr";

const CustomSelect = ({ category, onSelect, reset, filter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(category?.category);
  const dropdownRef = useRef(null);

  // Toggle relative visibility
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Select an option
  const handleSelect = (activeCategory, option) => {
    setSelected(option?.name);
    onSelect(activeCategory, option?.slug);
    setIsOpen(false);
  };

  // Reset selected category when "Clear Filters" is clicked
  useEffect(() => {
    if (reset) {
      setSelected(category?.category);
    }
  }, [reset, category?.category]);

  // Close relative when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`career-custom-select`} ref={dropdownRef}>
      <button
        className={`career-select-button font-primary ${
          filter[category?.category_slug] ? "active-dropdown" : ""
        }`}
        onClick={toggleDropdown}
      >
        {selected}
        <GrDown size={16} />
      </button>
      {isOpen && (
        <ul className="career-dropdown">
          {category?.subCategory?.map((option, index) => (
            <li
              key={index}
              style={{textTransform: "capitalize"}}
              onClick={() => handleSelect(category?.category_slug, option)}
            >
              {option?.title === "0 Year" ? "Fresher" : option?.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomSelect;
