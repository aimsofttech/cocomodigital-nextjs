// @ts-nocheck
"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "@/src/lib/navigation";
import { signOutDemo, useDemoSession } from "@/src/lib/demoAuth";
import { RiMenuFill } from "react-icons/ri";
import { IoIosArrowForward } from "react-icons/io";
import { HiArrowUpRight } from "react-icons/hi2";
import type { NavItem } from "../../../types/common.types";
import type {
  ShellServiceCategory,
  ShellNavService,
  ShellSolutionNavItem,
} from "../../lib/shellServerFetch";

interface HeaderProps {
  serviceCategories: ShellServiceCategory[];
  initialServices: ShellNavService[];
  solutions: ShellSolutionNavItem[];
}

function resolveImg(image: unknown): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  if (typeof image === "object" && (image as any).url) return String((image as any).url);
  return "";
}

function Header({ serviceCategories, initialServices, solutions }: HeaderProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState<boolean>(false);
  const [workDropdownOpen, setWorkDropdownOpen] = useState<boolean>(false);
  const [insideDropdownOpen, setInsideDropdownOpen] = useState<boolean>(false);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [serviceData, setServiceData] = useState<ShellNavService[]>(initialServices);

  /* The demo sign-in from /login. Null until the effect inside the hook reads
     storage, so the header renders signed-out on the server and swaps a tick
     later — signing in or out anywhere updates this without a reload. */
  const demoUser = useDemoSession();

  const location = useLocation();
  const currentPath = location.pathname;

  const isMobile = (): boolean => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredServicesCategory = useMemo((): ShellServiceCategory[] => {
    const featured = serviceCategories
      .filter(
        (c) =>
          c?.featuredOnHomepage && c?.category_name !== "Service Platform",
      )
      .sort(
        (a, b) =>
          ((a as any)?.homepageOrder ?? 999) -
          ((b as any)?.homepageOrder ?? 999),
      );
    const otherServices = serviceCategories.find(
      (c) => c?.category_name === "Our Other Services",
    );
    return otherServices ? [...featured, otherServices] : featured;
  }, [serviceCategories]);

  useEffect(() => {
    if (filteredServicesCategory?.length) {
      setActiveCategory(filteredServicesCategory[0]?.category_name);
      setActiveCategoryId(filteredServicesCategory[0]?.id);
    }
  }, [filteredServicesCategory]);

  const fetchServiceData = async (id: number): Promise<void> => {
    try {
      /* Phase 5l: the API services filtered by category. Drives
         the header megamenu category-hover preview rail. */
      const url = new URL("/content-api/services", window.location.origin);
      url.searchParams.set("where[category][equals]", String(id));
      url.searchParams.set("limit", "6");
      url.searchParams.set("sort", "order");
      url.searchParams.set("depth", "1");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const body = await res.json();
      setServiceData(body?.docs || []);
    } catch (err: any) {
      console.log(err.message || "Something went wrong");
    }
  };

  const toggleNavbar = (): void => {
    setExpanded((prev) => !prev);
  };

  const closeAllMenus = (): void => {
    setExpanded(false);
    setDropdownOpen(false);
    setSolutionsDropdownOpen(false);
    setWorkDropdownOpen(false);
    setInsideDropdownOpen(false);
  };

  const closeDesktopMenus = (): void => {
    if (!isMobile()) {
      setDropdownOpen(false);
      setSolutionsDropdownOpen(false);
      setWorkDropdownOpen(false);
      setInsideDropdownOpen(false);
    }
  };

  const openOnlyMenu = (menuName: 'services' | 'solutions' | 'work' | 'inside'): void => {
    setDropdownOpen(menuName === "services");
    setSolutionsDropdownOpen(menuName === "solutions");
    setWorkDropdownOpen(menuName === "work");
    setInsideDropdownOpen(menuName === "inside");
  };

  const handleCategoryClick = (categoryId: number, categoryName: string): void => {
    fetchServiceData(categoryId);
    setActiveCategoryId(categoryId);
    setActiveCategory(categoryName);
  };

  const logoutHandler = (): void => {
    signOutDemo();
    setExpanded(false);          // close the mobile menu if it was open
    /* Stay where you are. Signing out announces itself, so this header swaps
       Logout back for the signed-out state and any Edit affordances on the page
       disappear on the spot — the session visibly ends without taking the
       reader off whatever they were reading. */
  };

  const isCareerArea =
    currentPath === "/career" ||
    currentPath.startsWith("/job/") ||
    currentPath.startsWith("/job-application/");

  const ctaLabel = isCareerArea ? "Open Roles" : "Book Call";
  const ctaTo = isCareerArea ? "/career#career-open-roles" : "/ScheduleMeeting";

  /* Phase 8b 2026-05-25: was a hard-coded array; now fed from the
     `solutions-pages` the API collection (filtered to is_active) via
     shellServerFetch. Editors add/edit/delete solutions from
     /admin → Solutions pages and the dropdown updates automatically. */
  const solutionsNav: NavItem[] = solutions.map((s) => ({
    label: s.label,
    to: `/solutions/${s.slug}`,
  }));

  const workItems: NavItem[] = [
    { label: "IP Monetization", to: "/work/ip-monetization" },
    { label: "Content Created", to: "/work/content-created" },
    { label: "SMM Management", to: "/work/smm-management" },
    { label: "Marketing Campaigns", to: "/work/marketing-campaigns" },
  ];


  return (
    <>
      <div className="hide-div" />

      <div className={`header-main-wrapper ${scrolled ? "scrolled" : ""}`}>
        <div className="header-top-nav">
          <nav className="custom-navbar" aria-label="Main navigation">
            <div className="header-inner-container">
              <button
                type="button"
                aria-controls="basic-navbar-nav"
                aria-expanded={expanded}
                aria-label="Toggle navigation"
                onClick={toggleNavbar}
                className="header-mobile-toggle"
              >
                <RiMenuFill size={24} />
              </button>

              <Link to="/" className="header-logo" onClick={closeAllMenus}>
                <Image
                  src="/Images/logo/main-logo.png"
                  alt="Cocoma butterfly mark"
                  className="header-logo-icon"
                  width={40}
                  height={40}
                />
                <Image
                  src="/Images/logo/name-logo.png"
                  alt="cocoma digital"
                  className="header-logo-wordmark"
                  width={140}
                  height={40}
                />
              </Link>

              <div className="header-right-actions header-right-actions-mobile">
                {demoUser && (
                  <button
                    type="button"
                    className="logout-text logout-text-mobile"
                    onClick={logoutHandler}
                  >
                    Logout
                  </button>
                )}

                <Link href={ctaTo} className="header-book-call-btn">
                  <span>{ctaLabel}</span>
                  <HiArrowUpRight
                    style={{ color: "#000", fontWeight: "bold", strokeWidth: 1 }}
                  />
                </Link>
              </div>

              <div
                id="basic-navbar-nav"
                className={`custom-navbar-collapse ${expanded ? "show" : ""}`}
              >
                <div className="menu-items">
                  <div
                    className="custom-nav-dropdown for-new-pos font-primary"
                    onMouseEnter={() => !isMobile() && openOnlyMenu("services")}
                    onMouseLeave={closeDesktopMenus}
                  >
                    <button
                      type="button"
                      className="custom-dropdown-toggle"
                      aria-expanded={dropdownOpen}
                      onClick={() => {
                        if (dropdownOpen) setDropdownOpen(false);
                        else openOnlyMenu("services");
                      }}
                    >
                      SERVICES
                      <span className="custom-caret" />
                    </button>

                    {dropdownOpen && (
                      <div className="custom-dropdown-menu services-dropdown-menu">
                        {isMobile() ? (
                          <div>
                            {serviceCategories?.map((category) => (
                              <div key={category?.id}>
                                <button
                                  type="button"
                                  className={`dropdown-category ${activeCategoryId === category?.id ? "active" : ""
                                    }`}
                                  onClick={() =>
                                    handleCategoryClick(
                                      category?.id,
                                      category?.category_name
                                    )
                                  }
                                >
                                  {category?.category_name}
                                </button>

                                {activeCategoryId === category?.id && (
                                  <div className="subcategory-container-mobile">
                                    {serviceData?.map((item, index) => (
                                      <div key={index} className="subcategory-card">
                                        <Link
                                          to={`/services/${item?.slug}`}
                                          className="mobile-service-link"
                                          onClick={closeAllMenus}
                                        >
                                          <div className="mobile-service-row">
                                            {resolveImg(item?.image) && <Image
                                              src={resolveImg(item.image)}
                                              alt={item?.title || ""}
                                              className="mobile-service-render-image"
                                              width={48}
                                              height={48}
                                            />}
                                            <div>
                                              <strong>{item?.title}</strong>
                                            </div>
                                          </div>
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="dropdown-container">
                            <div className="dropdown-left">
                              <div className="dropdown-left-heading-wrap">
                                <h4>our services by skills</h4>
                              </div>

                              {filteredServicesCategory?.map((category) => (
                                <button
                                  type="button"
                                  key={category?.id}
                                  className={`dropdown-category ${activeCategoryId === category?.id ? "active" : ""
                                    }`}
                                  onMouseEnter={() =>
                                    handleCategoryClick(
                                      category?.id,
                                      category?.category_name
                                    )
                                  }
                                  onClick={() =>
                                    handleCategoryClick(
                                      category?.id,
                                      category?.category_name
                                    )
                                  }
                                >
                                  <span>{category?.category_name}</span>
                                  <IoIosArrowForward size={25} />
                                </button>
                              ))}
                            </div>

                            <div className="dropdown-right">
                              <div className="dropdown-right-cat-heading">
                                {activeCategory}
                              </div>

                              <div className="services-header-grid">
                                {serviceData?.map((item, index) => (
                                  <div key={index} className="services-header-item">
                                    <Link
                                      to={`/services/${item?.slug}`}
                                      className="service-header-link"
                                      onClick={closeAllMenus}
                                    >
                                      {resolveImg(item?.image) && <Image
                                        src={resolveImg(item.image)}
                                        alt={item?.title || ""}
                                        className="service-icon"
                                        width={48}
                                        height={48}
                                      />}
                                      <div className="service-title-wrap">
                                        <strong>{item?.title}</strong>
                                      </div>
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className="our-work-custom-nav-dropdown font-primary"
                    onMouseEnter={() => !isMobile() && openOnlyMenu("solutions")}
                    onMouseLeave={closeDesktopMenus}
                  >
                    <button
                      type="button"
                      className="custom-dropdown-toggle"
                      aria-expanded={solutionsDropdownOpen}
                      onClick={() => {
                        if (solutionsDropdownOpen) setSolutionsDropdownOpen(false);
                        else openOnlyMenu("solutions");
                      }}
                    >
                      SOLUTIONS
                      <span className="custom-caret" />
                    </button>

                    {solutionsDropdownOpen && (
                      <div className="custom-dropdown-menu simple-dropdown-menu">
                        {solutionsNav.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="custom-dropdown-item"
                            onClick={closeAllMenus}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="our-work-custom-nav-dropdown font-primary"
                    onMouseEnter={() => !isMobile() && openOnlyMenu("work")}
                    onMouseLeave={closeDesktopMenus}
                  >
                    <button
                      type="button"
                      className="custom-dropdown-toggle"
                      aria-expanded={workDropdownOpen}
                      onClick={() => {
                        if (workDropdownOpen) setWorkDropdownOpen(false);
                        else openOnlyMenu("work");
                      }}
                    >
                      WORK
                      <span className="custom-caret" />
                    </button>

                    {workDropdownOpen && (
                      <div className="custom-dropdown-menu simple-dropdown-menu work-dropdown-menu">
                        {workItems.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="custom-dropdown-item"
                            onClick={closeAllMenus}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>


                </div>
              </div>

              <div className="header-right-actions header-right-actions-desktop">
                <Link
                  to="/contact-us"
                  className="header-book-call-btn header-book-call-btn--desktop"
                >
                  <span>GET STARTED</span>
                  <HiArrowUpRight
                    style={{ color: "#000", fontWeight: "bold", strokeWidth: 1 }}
                  />
                </Link>

                {demoUser && (
                  <button type="button" className="logout-text" onClick={logoutHandler}>
                    Logout
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

export default Header;
