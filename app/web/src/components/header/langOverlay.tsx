// @ts-nocheck
import React, { useState } from "react";

// List of languages for selection
const languages: string[] = [
  "english",
  "french",
  "german",
  "italian",
  "spanish",
  "dutch",
];

function LanguageSelector() {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    sessionStorage.getItem("selectedLanguage") || "english"
  );

  // Handle the selection of a language
  const handleLanguageSelect = (language: string): void => {
    setSelectedLanguage(language);
    sessionStorage.setItem("selectedLanguage", language); // Store the language in sessionStorage
    setShowDropdown(false); // Close the relative after selection
  };

  return (
    <div className="language-dropdown-container">
      <button
        type="button"
        id="language-dropdown-toggle"
        className="language-dropdown-toggle"
        aria-haspopup="listbox"
        aria-expanded={showDropdown}
        onClick={() => setShowDropdown((isOpen) => !isOpen)}
      >
        {selectedLanguage.substring(0, 2).toUpperCase()}
      </button>
      {showDropdown && (
        <div
          className="language-dropdown-menu"
          role="listbox"
          aria-labelledby="language-dropdown-toggle"
        >
          {languages.map((language) => (
            <button
              type="button"
              key={language}
              onClick={() => handleLanguageSelect(language)}
              aria-selected={language === selectedLanguage}
              className={`language-dropdown-item ${
                language === selectedLanguage ? "is-active" : ""
              }`}
              role="option"
            >
              {language.charAt(0).toUpperCase() + language.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
