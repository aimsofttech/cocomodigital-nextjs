// @ts-nocheck
import React, { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { Link } from "@/src/lib/navigation";

type DropdownKey = "services" | "expertise" | "solutions";

interface DropdownState {
  services: boolean;
  expertise: boolean;
  solutions: boolean;
}

export default function Menu() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({
    services: false,
    expertise: false,
    solutions: false,
  });
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Check screen size to handle mobile vs desktop behavior
  useEffect(() => {
    const checkScreenSize = (): void => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const toggleMenu = (): void => {
    setIsOpen(!isOpen);
  };

  const toggleDropdown = (menu: DropdownKey): void => {
    setDropdownOpen((prevState) => {
      const newState: DropdownState = {
        services: false,
        expertise: false,
        solutions: false,
      };

      // Toggle the clicked relative
      newState[menu] = !prevState[menu];
      return newState;
    });
  };

  return (
    <div className="menu-container">
      {/* Hamburger icon visible on mobile */}
      <div className="hamburger-icon" onClick={toggleMenu}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </div>

      {/* Menu items */}
      <ul
        className="menu-items"
        style={{ display: isOpen || !isMobile ? "flex" : "none" }}
      >
        <li>
          <Link to="/">Home </Link>
        </li>

        {/* Dropdown for Our Services */}
        <li
          className="relative"
          onClick={() => toggleDropdown("services")}
          onMouseEnter={() => !isMobile && toggleDropdown("services")}
          onMouseLeave={() => !isMobile && toggleDropdown("services")}
        >
          Our Services
          <ul
            className={`absolute z-50 mt-2 min-w-40 rounded-md border border-neutral-200 bg-white p-2 text-black shadow-lg ${dropdownOpen.services ? "block" : "hidden"}`}
          >
            <li>
              <Link to="/service">About</Link>
            </li>
            <li>Service 2</li>
            <li>Service 3</li>
          </ul>
        </li>

        {/* Dropdown for Our Expertise */}
        <li
          className="relative"
          onClick={() => toggleDropdown("expertise")}
          onMouseEnter={() => !isMobile && toggleDropdown("expertise")}
          onMouseLeave={() => !isMobile && toggleDropdown("expertise")}
        >
          Our Expertise
          <ul
            className={`absolute z-50 mt-2 min-w-40 rounded-md border border-neutral-200 bg-white p-2 text-black shadow-lg ${dropdownOpen.expertise ? "block" : "hidden"}`}
          >
            <li>Expertise 1</li>
            <li>Expertise 2</li>
            <li>Expertise 3</li>
          </ul>
        </li>

        {/* Dropdown for Solutions */}
        <li
          className="relative"
          onClick={() => toggleDropdown("solutions")}
          onMouseEnter={() => !isMobile && toggleDropdown("solutions")}
          onMouseLeave={() => !isMobile && toggleDropdown("solutions")}
        >
          Solutions
          <ul
            className={`absolute z-50 mt-2 min-w-40 rounded-md border border-neutral-200 bg-white p-2 text-black shadow-lg ${dropdownOpen.solutions ? "block" : "hidden"}`}
          >
            <li>Solution 1</li>
            <li>Solution 2</li>
            <li>Solution 3</li>
          </ul>
        </li>
      </ul>
    </div>
  );
}
